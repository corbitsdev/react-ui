"use client";

import { ArrowUp, Square } from "lucide-react";
import {
  createContext,
  forwardRef,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type * as React from "react";

import {
  usePromptInput,
  type UsePromptInputResult,
} from "../hooks/use-prompt-input.js";
import { useScrollCurrentIntoView } from "../hooks/use-scroll-current-into-view.js";
import { splitPromptSegments, type PromptToken } from "../lib/prompt-tokens.js";
import { cn } from "../lib/utils.js";

/** Where the reply to the last message stands: `submitted` until it starts
 * to arrive, `streaming` while it does. */
export type PromptInputStatus = "ready" | "submitted" | "streaming";

type PromptInputContextValue = {
  readonly value: string;
  readonly status: PromptInputStatus;
  readonly disabled: boolean;
  readonly tokens: readonly PromptToken[];
  readonly textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  readonly listId: string;
  readonly prompt: UsePromptInputResult;
  /** Whether a `PromptInputSuggestions` part is mounted. */
  readonly suggest: boolean;
  readonly registerSuggestions: () => () => void;
};

const isProduction =
  typeof process !== "undefined" && process.env?.NODE_ENV === "production";

const PromptInputContext = createContext<PromptInputContextValue | null>(null);

function usePromptInputContext(part: string): PromptInputContextValue {
  const context = useContext(PromptInputContext);
  if (context === null) {
    throw new Error(`${part} must be rendered inside a PromptInput`);
  }
  return context;
}

/** Whether the enclosing `PromptInput` is `disabled`; `false` outside one.
 * The toolbar parts default their own `disabled` to it, and a part the host
 * builds can do the same. */
export function usePromptInputDisabled(): boolean {
  return useContext(PromptInputContext)?.disabled ?? false;
}

function optionId(listId: string, token: PromptToken): string {
  return `${listId}-${token.id}`;
}

export type PromptInputProps = Omit<
  React.ComponentProps<"form">,
  "onSubmit"
> & {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  /** Enter or the send button, with something to send (see `canSubmit`)
   * while `status` is ready. */
  readonly onSubmit: () => void;
  /** Whether there is something to send. Defaults to `value` holding more
   * than whitespace. A host that sends more than the text, such as
   * attachments, passes its own answer, e.g. `value.trim() !== "" ||
   * files.length > 0`. Enter and `PromptInputSubmit` both follow it; a
   * `status` other than ready, `disabled` and IME composition still stop a
   * submit. */
  readonly canSubmit?: boolean;
  /** Mentions and commands to highlight and, with `PromptInputSuggestions`,
   * to suggest. */
  readonly tokens?: readonly PromptToken[];
  /** While not `ready`, neither Enter nor the send button submits. */
  readonly status?: PromptInputStatus;
  /** Disables the textarea and sending, and the toolbar parts inside that do
   * not set their own `disabled`. */
  readonly disabled?: boolean;
};

/**
 * The message box. Fully controlled: the text is the host's, and every
 * change, submit and stop is a callback. Each feature is a part, present
 * only when included: `PromptInputTextarea` for the text,
 * `PromptInputSuggestions` for the `@`/`/` list, `PromptInputSubmit` for
 * send and stop.
 *
 * `status` lives here rather than on the button so Enter and the button
 * follow the same rule: nothing is sent while a reply is in flight.
 */
export function PromptInput({
  value,
  onValueChange,
  onSubmit,
  tokens = [],
  status = "ready",
  disabled = false,
  canSubmit,
  className,
  children,
  ...props
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  // A count, not a flag: StrictMode mounts parts twice, and a host may
  // render a list conditionally.
  const [suggestionParts, setSuggestionParts] = useState(0);
  const registerSuggestions = useCallback(() => {
    setSuggestionParts((count) => count + 1);
    return () => setSuggestionParts((count) => count - 1);
  }, []);
  const suggest = suggestionParts > 0;

  const prompt = usePromptInput({
    value,
    onValueChange,
    onSubmit,
    tokens,
    suggest,
    busy: status !== "ready",
    disabled,
    canSubmit,
    textareaRef,
  });

  const context: PromptInputContextValue = {
    value,
    status,
    disabled,
    tokens,
    textareaRef,
    listId,
    prompt,
    suggest,
    registerSuggestions,
  };

  return (
    <PromptInputContext.Provider value={context}>
      <form
        data-slot="prompt-input"
        data-status={status}
        data-disabled={disabled ? "" : undefined}
        className={cn(
          "relative flex items-end gap-2 rounded-lg border border-input bg-background p-1.5",
          // A `PromptInputToolbar` placed last takes a row of its own.
          "has-[>[data-slot=prompt-input-toolbar]]:flex-wrap",
          // The textarea gives up its own outline for one round the box.
          "has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-ring",
          className,
        )}
        {...props}
        onSubmit={(event) => {
          event.preventDefault();
          prompt.submit();
        }}
      >
        {children}
      </form>
    </PromptInputContext.Provider>
  );
}

/** Whether the browser sizes a textarea to its text by itself. Read once, at
 * load; where it can't, `useMeasuredHeight` does the job. */
const NATIVE_FIELD_SIZING =
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("field-sizing", "content");

/**
 * The fallback for browsers without `field-sizing: content`: after every
 * change, and whenever the width changes the wrapping, collapse the textarea
 * and set its height to what its text needs. The CSS max-height caps it, past
 * which it scrolls. Collapsing forces a layout of the page, which is why this
 * only runs where the browser cannot size the field itself.
 */
function useMeasuredHeight(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  enabled: boolean,
) {
  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!enabled || element === null) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [textareaRef, value, enabled]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!enabled || element === null || typeof ResizeObserver === "undefined") {
      return;
    }
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [textareaRef, enabled]);
}

// Everything that decides where a letter lands, shared by the textarea and
// the mirror under it so the two wrap identically. Nothing here may differ
// between them, and the highlight adds nothing that takes up width.
const FIELD_TEXT =
  "m-0 border-0 px-2.5 py-2 [font:inherit] [letter-spacing:inherit] [tab-size:inherit] whitespace-pre-wrap wrap-break-word [scrollbar-gutter:stable]";

const ZERO_WIDTH_SPACE = "\u200B";

function assignRef<T>(ref: React.Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref !== null && ref !== undefined) ref.current = node;
}

export type PromptInputTextareaProps = Omit<
  React.ComponentProps<"textarea">,
  "value" | "defaultValue" | "onChange" | "disabled"
> & {
  /** Classes for the box holding the textarea and its mirror. Text styles
   * belong here too: both layers inherit them. */
  readonly className?: string;
};

/**
 * The text. A native textarea, so editing, undo, IME and autofill stay the
 * browser's, with its text made transparent over an `aria-hidden` mirror that
 * renders the same text, wrapped the same way, with known tokens
 * highlighted. Caret and selection are the textarea's; the visible letters
 * are the mirror's, which follows the textarea's scroll.
 *
 * It grows with its text up to its max height, then scrolls: through CSS
 * `field-sizing` where the browser has it, by measuring elsewhere.
 *
 * In forced-colors mode the browser paints the textarea's own text, so the
 * mirror steps aside rather than doubling every letter.
 */
export const PromptInputTextarea = forwardRef<
  HTMLTextAreaElement,
  PromptInputTextareaProps
>(function PromptInputTextarea(
  {
    className,
    placeholder = "Send a message…",
    "aria-label": ariaLabel = "Message",
    rows = 1,
    onKeyDown,
    onSelect,
    onBlur,
    onScroll,
    ...props
  },
  ref,
) {
  const { value, disabled, tokens, textareaRef, listId, prompt, suggest } =
    usePromptInputContext("PromptInputTextarea");
  const mirrorTextRef = useRef<HTMLDivElement>(null);
  const segments = useMemo(
    () => splitPromptSegments(value, tokens),
    [value, tokens],
  );

  useMeasuredHeight(textareaRef, value, !NATIVE_FIELD_SIZING);

  // Translating the mirror's text rather than scrolling the mirror: an
  // `overflow: hidden` box clamps `scrollTop` against its own bottom padding,
  // which engines treat differently from a textarea's.
  const syncScroll = useCallback(() => {
    const element = textareaRef.current;
    const mirrorText = mirrorTextRef.current;
    if (element === null || mirrorText === null) return;
    mirrorText.style.transform = `translateY(${-element.scrollTop}px)`;
  }, [textareaRef]);
  useLayoutEffect(syncScroll, [syncScroll, value]);

  const active = prompt.activeSuggestion;
  const listOpen = active !== undefined;

  return (
    <div
      data-slot="prompt-input-field"
      className={cn("relative min-w-0 flex-1 text-sm leading-6", className)}
    >
      <div
        aria-hidden="true"
        data-slot="prompt-input-mirror"
        className={cn(
          FIELD_TEXT,
          "pointer-events-none absolute inset-0 overflow-hidden text-foreground select-none forced-colors:hidden",
          disabled && "opacity-50",
        )}
      >
        <div ref={mirrorTextRef}>
          {segments.map((segment, index) =>
            segment.token === undefined ? (
              segment.text
            ) : (
              <mark
                key={index}
                data-slot="prompt-input-token"
                data-kind={segment.token.kind}
                className="rounded-sm bg-primary/20 text-primary-emphasis underline decoration-primary underline-offset-2 [box-decoration-break:clone]"
              >
                {segment.text}
              </mark>
            ),
          )}
          {/* A trailing newline only takes up its line with something after it. */}
          {ZERO_WIDTH_SPACE}
        </div>
      </div>
      <textarea
        {...props}
        ref={(node) => {
          textareaRef.current = node;
          assignRef(ref, node);
        }}
        data-slot="prompt-input-textarea"
        value={value}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        // What the field can do, so set whenever a list part is mounted,
        // open or not. A textarea may not carry `aria-expanded`, so the
        // list's opening and closing is announced by its status instead.
        aria-autocomplete={suggest ? "list" : undefined}
        aria-haspopup={suggest ? "listbox" : undefined}
        aria-controls={listOpen ? listId : undefined}
        aria-activedescendant={listOpen ? optionId(listId, active) : undefined}
        className={cn(
          FIELD_TEXT,
          "relative z-10 block max-h-50 min-h-10 w-full resize-none overflow-y-auto bg-transparent text-transparent caret-foreground",
          "field-sizing-content placeholder:text-muted-foreground selection:bg-primary/30",
          "focus-visible:outline-none disabled:cursor-not-allowed",
        )}
        onChange={prompt.textareaProps.onChange}
        onSelect={(event) => {
          onSelect?.(event);
          prompt.textareaProps.onSelect(event);
        }}
        onKeyDown={(event) => {
          // An Escape the open list claimed (see `usePromptInput`) arrives
          // already prevented; it is still the list's to close.
          const claimed = event.key === "Escape" && event.defaultPrevented;
          onKeyDown?.(event);
          if (claimed || !event.defaultPrevented) {
            prompt.textareaProps.onKeyDown(event);
          }
        }}
        onBlur={(event) => {
          onBlur?.(event);
          prompt.textareaProps.onBlur();
        }}
        onScroll={(event) => {
          onScroll?.(event);
          syncScroll();
        }}
      />
    </div>
  );
});

const SuggestionScrollContext =
  createContext<React.RefObject<HTMLLIElement | null> | null>(null);

export type PromptInputSuggestionsProps = Omit<
  React.ComponentProps<"ul">,
  "children" | "id"
> & {
  /** Renders one suggestion, and must return a `PromptInputSuggestion` for
   * `token`: that element carries the id the textarea's
   * `aria-activedescendant` names, and the pointer and click handling. Pass
   * custom content as its children. Defaults to a bare
   * `PromptInputSuggestion`. */
  readonly children?: (token: PromptToken) => React.ReactNode;
  /** What a screen reader hears when the list opens or its length changes,
   * e.g. "3 suggestions". A localized host passes its own wording. */
  readonly announce?: (count: number) => string;
};

function announceCount(count: number): string {
  return count === 1 ? "1 suggestion" : `${count} suggestions`;
}

/**
 * The list of tokens the `@` or `/` being typed could become. Including it
 * turns suggestions on: ArrowUp and ArrowDown move through it, Enter or Tab
 * picks, Escape closes (see `usePromptInput`). Focus stays in the textarea
 * throughout, which points at the current option with
 * `aria-activedescendant`. The list renders only while there is something
 * to suggest; a visually hidden status beside it stays mounted and announces
 * how many suggestions there are, and empties when the list closes. Its `id`
 * is the one the textarea's `aria-controls` names, so it is not overridable.
 */
export function PromptInputSuggestions({
  className,
  children,
  announce = announceCount,
  "aria-label": ariaLabel,
  onMouseDown,
  ...props
}: PromptInputSuggestionsProps) {
  const { listId, prompt, registerSuggestions } = usePromptInputContext(
    "PromptInputSuggestions",
  );
  useLayoutEffect(registerSuggestions, [registerSuggestions]);
  const currentRef = useScrollCurrentIntoView<HTMLLIElement>(
    prompt.activeSuggestion?.id ?? "",
  );

  // A render callback that returns its own element leaves the textarea's
  // `aria-activedescendant` pointing at nothing; say so during development.
  const activeId =
    prompt.activeSuggestion === undefined
      ? undefined
      : optionId(listId, prompt.activeSuggestion);
  const statusRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const status = statusRef.current;
    if (isProduction || activeId === undefined || status === null) return;
    if (status.ownerDocument.getElementById(activeId) !== null) return;
    console.error(
      "PromptInputSuggestions: the current suggestion has no element with " +
        "its id. A render callback must return a PromptInputSuggestion for " +
        "the token it is given; pass custom content as its children.",
    );
  }, [activeId]);

  const first = prompt.suggestions[0];
  return (
    <SuggestionScrollContext.Provider value={currentRef}>
      {/* Mounted with the part, never with the list: a live region inserted
          along with its text is not reliably announced. */}
      <span ref={statusRef} role="status" className="sr-only">
        {first === undefined ? "" : announce(prompt.suggestions.length)}
      </span>
      {first === undefined ? null : (
        <ul
          {...props}
          id={listId}
          role="listbox"
          aria-label={
            ariaLabel ?? (first.kind === "command" ? "Commands" : "Mentions")
          }
          data-slot="prompt-input-suggestions"
          className={cn(
            "absolute inset-x-0 bottom-full z-20 mb-2 flex max-h-60 flex-col gap-px overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground",
            className,
          )}
          // Held off on the whole list, not each option: a press on its
          // padding, between rows or on its scrollbar would otherwise blur
          // the textarea, which closes the list.
          onMouseDown={(event) => {
            onMouseDown?.(event);
            event.preventDefault();
          }}
        >
          {prompt.suggestions.map((token) =>
            children === undefined ? (
              <PromptInputSuggestion key={token.id} token={token} />
            ) : (
              <Fragment key={token.id}>{children(token)}</Fragment>
            ),
          )}
        </ul>
      )}
    </SuggestionScrollContext.Provider>
  );
}

export type PromptInputSuggestionProps = Omit<
  React.ComponentProps<"li">,
  "id"
> & {
  readonly token: PromptToken;
};

/** One option in `PromptInputSuggestions`. Pointing at it makes it current;
 * clicking picks it without taking focus from the textarea. Its `id` is the
 * one the textarea's `aria-activedescendant` names, so it is not
 * overridable. A host `onClick` runs first and can keep the pick from
 * happening with `preventDefault`. */
export function PromptInputSuggestion({
  token,
  className,
  children,
  onPointerMove,
  onClick,
  ...props
}: PromptInputSuggestionProps) {
  const { listId, prompt } = usePromptInputContext("PromptInputSuggestion");
  const currentRef = useContext(SuggestionScrollContext);
  const active = prompt.activeSuggestion?.id === token.id;
  return (
    <li
      {...props}
      ref={active ? currentRef : undefined}
      id={optionId(listId, token)}
      role="option"
      aria-selected={active}
      data-slot="prompt-input-suggestion"
      data-active={active ? "" : undefined}
      className={cn(
        "flex cursor-default items-baseline gap-2 rounded-md px-2 py-1 text-sm data-[active]:bg-muted",
        className,
      )}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (!active) prompt.setActiveSuggestion(token.id);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) prompt.pick(token);
      }}
    >
      {children ?? (
        <>
          <span className="font-medium">{token.token}</span>
          {token.detail === undefined ? null : (
            <span className="truncate text-muted-foreground">
              {token.detail}
            </span>
          )}
        </>
      )}
    </li>
  );
}

export type PromptInputSubmitProps = Omit<
  React.ComponentProps<"button">,
  "type" | "onClick"
> & {
  /** Offered while a reply is in flight: its presence turns Send into Stop. */
  readonly onStop?: () => void;
};

/**
 * Send, or Stop while a reply is in flight (`PromptInput`'s `status` is not
 * `ready`) and `onStop` is given. One button that changes rather than two,
 * so Stop is where the user's eye already is, and focus stays on it when the
 * reply ends. Its name is "Send" or "Stop" unless the host passes an
 * `aria-label`, which a localized host sets from the same `status`.
 *
 * With nothing to send, or a reply in flight and no `onStop`, Send is
 * `aria-disabled` rather than `disabled`: a disabled button drops focus to
 * the page, and Send turns unsendable under the user's focus every time a
 * host clears the draft on submit. A click still submits the form, whose
 * submit does nothing until `canSubmit`. A host's `disabled` is a real one:
 * this button's always, `PromptInput`'s for Send.
 */
export function PromptInputSubmit({
  onStop,
  className,
  disabled: disabledProp = false,
  "aria-label": ariaLabel,
  ...props
}: PromptInputSubmitProps) {
  const { status, disabled, prompt } =
    usePromptInputContext("PromptInputSubmit");
  const stop = status !== "ready" && onStop !== undefined;
  return (
    <button
      {...props}
      type={stop ? "button" : "submit"}
      data-slot="prompt-input-submit"
      data-status={status}
      aria-label={ariaLabel ?? (stop ? "Stop" : "Send")}
      disabled={disabledProp || (!stop && disabled)}
      aria-disabled={(!stop && !prompt.canSubmit) || undefined}
      onClick={
        stop
          ? (event) => {
              // A host that sets `status` back to ready inside `onStop`
              // turns this into a submit button before the click's default
              // action runs, which would then send the draft.
              event.preventDefault();
              onStop();
            }
          : undefined
      }
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-md transition-colors disabled:opacity-40 aria-disabled:opacity-40",
        stop
          ? "bg-muted text-foreground hover:bg-secondary"
          : "bg-primary text-primary-foreground hover:bg-primary-active",
        className,
      )}
    >
      {stop ? (
        <Square className="size-3.5 fill-current" aria-hidden />
      ) : (
        <ArrowUp className="size-4" aria-hidden />
      )}
    </button>
  );
}
