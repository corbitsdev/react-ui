import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  RefObject,
  SyntheticEvent,
} from "react";

import {
  findActivePromptToken,
  insertPromptToken,
  matchPromptTokens,
  type ActivePromptToken,
  type PromptToken,
} from "../lib/prompt-tokens.js";

export type UsePromptInputOptions = {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  /** Called by Enter, or by `submit`, when there is something to send. */
  readonly onSubmit: () => void;
  /** Every token that can be suggested. */
  readonly tokens: readonly PromptToken[];
  /** Whether a suggestion list is shown at all. Without one, arrows, Tab and
   * Escape keep their usual meaning. */
  readonly suggest: boolean;
  /** True while a reply is in flight: Enter does not send. */
  readonly busy: boolean;
  readonly disabled: boolean;
  /** Whether there is something to send. Defaults to `value` holding more
   * than whitespace; a host that sends more than the text, such as
   * attachments, says so here. `busy`, `disabled` and IME composition still
   * stop a submit. */
  readonly canSubmit?: boolean | undefined;
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
};

export type UsePromptInputResult = {
  /** The `@` or `/` token the caret is in, or null. */
  readonly activeToken: ActivePromptToken | null;
  /** What the active token could become; empty while the list is closed. */
  readonly suggestions: readonly PromptToken[];
  readonly activeSuggestion: PromptToken | undefined;
  readonly setActiveSuggestion: (id: string) => void;
  /** Replaces the active token with `token` and puts the caret after it. */
  readonly pick: (token: PromptToken) => void;
  /** Whether there is something to send and nothing stops sending it. */
  readonly canSubmit: boolean;
  readonly submit: () => void;
  /** Spread onto the textarea. While the list is open, Escape reaches
   * `onKeyDown` with `defaultPrevented` already set (see `usePromptInput`).
   * A host that wraps `onKeyDown` and skips this one for a prevented key
   * must still pass that Escape on, or the list never closes. */
  readonly textareaProps: {
    readonly onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
    readonly onSelect: (event: SyntheticEvent<HTMLTextAreaElement>) => void;
    readonly onKeyDown: (
      event: ReactKeyboardEvent<HTMLTextAreaElement>,
    ) => void;
    readonly onBlur: () => void;
  };
};

/** Where a collapsed caret sits; a selected range has no caret to complete at. */
function caretOf(element: HTMLTextAreaElement): number | null {
  return element.selectionStart === element.selectionEnd
    ? element.selectionStart
    : null;
}

function keyOf(token: ActivePromptToken): string {
  return `${token.start}:${token.kind}:${token.query}`;
}

/**
 * The prompt's keyboard and suggestion logic, headless.
 *
 * The text stays the host's: this hook only reads `value` and asks for
 * changes through `onValueChange`. What it owns is where the caret is (so it
 * knows which `@` or `/` token is being typed), which suggestion is current,
 * and whether Escape closed the list.
 *
 * Keys: while suggestions show, ArrowDown and ArrowUp move through them and
 * wrap, Enter or Tab picks the current one and Escape closes the list until
 * the token changes or the caret leaves it. Otherwise Enter submits and
 * Shift+Enter inserts a newline. Nothing happens during IME composition,
 * where Enter commits a candidate rather than the message.
 *
 * While the list is open, an Escape in the textarea is prevented from the
 * window's capture phase, before any React handler runs, so an enclosing
 * dialog or popover leaves it to the list. It still reaches
 * `textareaProps.onKeyDown`, which closes the list.
 *
 * The current suggestion is held by id, not index, so it stays on the same
 * row while typing narrows the list.
 */
export function usePromptInput({
  value,
  onValueChange,
  onSubmit,
  tokens,
  suggest,
  busy,
  disabled,
  canSubmit: hasSomethingToSend = value.trim() !== "",
  textareaRef,
}: UsePromptInputOptions): UsePromptInputResult {
  const [caret, setCaret] = useState<number | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [requestedId, setRequestedId] = useState<string | undefined>();
  const pendingCaret = useRef<{ value: string; caret: number } | null>(null);

  const activeToken = useMemo(
    () =>
      caret === null || caret > value.length
        ? null
        : findActivePromptToken(value, caret),
    [value, caret],
  );
  const suggestions = useMemo(
    () =>
      !suggest ||
      disabled ||
      activeToken === null ||
      keyOf(activeToken) === dismissedKey
        ? []
        : matchPromptTokens(tokens, activeToken),
    [suggest, disabled, activeToken, dismissedKey, tokens],
  );
  const activeSuggestion =
    suggestions.find((token) => token.id === requestedId) ?? suggestions[0];
  const listOpen = activeSuggestion !== undefined;

  // What Escape closed and which row the arrows chose belong to the token
  // they were pressed in. Once the caret is in no token, drop both, so the
  // next token, even the same text at the same place in a new draft, opens
  // with its first suggestion current.
  const placeCaret = useCallback((text: string, at: number | null) => {
    setCaret(at);
    if (at === null || findActivePromptToken(text, at) === null) {
      setDismissedKey(null);
      setRequestedId(undefined);
    }
  }, []);

  // A Radix dialog or popover around the prompt dismisses on an Escape it
  // sees in the document's capture phase, before React's handlers run,
  // unless the event is already marked handled. While the list is open, mark
  // it first from the window's capture phase; `onKeyDown` still closes the
  // list, so propagation is left alone.
  useEffect(() => {
    const element = textareaRef.current;
    if (!listOpen || element === null) return;
    const view = element.ownerDocument.defaultView;
    if (view === null) return;
    const claimEscape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        event.target === element &&
        !event.isComposing
      ) {
        event.preventDefault();
      }
    };
    view.addEventListener("keydown", claimEscape, { capture: true });
    return () =>
      view.removeEventListener("keydown", claimEscape, { capture: true });
  }, [listOpen, textareaRef]);

  // A pick that could not go through the browser's editing (see `pick`)
  // set the value directly, which leaves the caret at the end. Put it back
  // after the token, unless the host settled on some other text.
  //
  // Any other value the host sets, such as an inserted "@", moves the caret
  // without a select event, so read it again while the textarea has focus;
  // the caret held from the last event would point into the old text.
  useLayoutEffect(() => {
    const pending = pendingCaret.current;
    pendingCaret.current = null;
    const element = textareaRef.current;
    if (element === null) return;
    if (pending !== null && pending.value === value) {
      element.setSelectionRange(pending.caret, pending.caret);
      placeCaret(value, pending.caret);
    } else if (element.ownerDocument.activeElement === element) {
      placeCaret(value, caretOf(element));
    }
  }, [value, textareaRef, placeCaret]);

  const canSubmit = !disabled && !busy && hasSomethingToSend;
  const submit = () => {
    if (canSubmit) onSubmit();
  };

  const pick = (token: PromptToken) => {
    if (activeToken === null) return;
    const next = insertPromptToken(value, activeToken, token);
    setRequestedId(undefined);
    const element = textareaRef.current;
    // Inserting through the browser keeps the pick on its undo stack, so
    // Cmd+Z takes it back; setting the value directly would clear that
    // stack. `execCommand` is deprecated but remains the only way to do it.
    if (element !== null && typeof document.execCommand === "function") {
      const inserted = next.value.slice(
        activeToken.start,
        next.value.length - (value.length - activeToken.end),
      );
      element.focus();
      element.setSelectionRange(activeToken.start, activeToken.end);
      if (document.execCommand("insertText", false, inserted)) {
        // The browser leaves the caret after the inserted text, which is
        // still inside the token when a following space was reused.
        element.setSelectionRange(next.caret, next.caret);
        placeCaret(next.value, next.caret);
        return;
      }
    }
    pendingCaret.current = next;
    onValueChange(next.value);
  };

  const move = (step: number) => {
    const index =
      activeSuggestion === undefined
        ? -1
        : suggestions.indexOf(activeSuggestion);
    const next = (index + step + suggestions.length) % suggestions.length;
    setRequestedId(suggestions[next]?.id);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    // 229 is what Safari reports for the Enter that ends a composition,
    // after `isComposing` has already turned false.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (activeSuggestion !== undefined && activeToken !== null) {
      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp":
          event.preventDefault();
          move(event.key === "ArrowDown" ? 1 : -1);
          return;
        case "Enter":
        case "Tab":
          if (event.shiftKey) break;
          event.preventDefault();
          pick(activeSuggestion);
          return;
        case "Escape":
          // Kept from handlers further out, which would otherwise act on it
          // too; Radix layers listen earlier and are held off by the effect
          // above.
          event.preventDefault();
          event.stopPropagation();
          setDismissedKey(keyOf(activeToken));
          return;
        default:
          break;
      }
    }
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (!event.repeat) submit();
  };

  return {
    activeToken,
    suggestions,
    activeSuggestion,
    setActiveSuggestion: setRequestedId,
    pick,
    canSubmit,
    submit,
    textareaProps: {
      onChange: (event) => {
        placeCaret(event.currentTarget.value, caretOf(event.currentTarget));
        onValueChange(event.currentTarget.value);
      },
      onSelect: (event) =>
        placeCaret(event.currentTarget.value, caretOf(event.currentTarget)),
      onKeyDown,
      onBlur: () => placeCaret(value, null),
    },
  };
}
