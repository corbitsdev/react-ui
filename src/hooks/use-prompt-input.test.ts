import { describe, expect, test } from "bun:test";
import { act, createElement, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import type { PromptToken } from "../lib/prompt-tokens.js";
import {
  usePromptInput,
  type UsePromptInputResult,
} from "./use-prompt-input.js";

const TOKENS: readonly PromptToken[] = [
  { id: "ada", kind: "mention", token: "@Ada" },
  { id: "adam", kind: "mention", token: "@Adam" },
  { id: "alan", kind: "mention", token: "@Alan" },
  { id: "brief", kind: "command", token: "/brief" },
];

const setNativeValue = Object.getOwnPropertyDescriptor(
  HTMLTextAreaElement.prototype,
  "value",
)?.set;

/**
 * Stands in for the browser's `insertText`, which the test DOM lacks, so a
 * pick takes the path it takes in a browser: the selection is replaced, the
 * caret is left after the inserted text and `input` fires. Returns the undo.
 */
function installInsertText(): () => void {
  const execCommand = (command: string, _showUi?: boolean, text = "") => {
    const element = document.activeElement;
    if (command !== "insertText" || !(element instanceof HTMLTextAreaElement)) {
      return false;
    }
    const { selectionStart, selectionEnd, value } = element;
    setNativeValue?.call(
      element,
      `${value.slice(0, selectionStart)}${text}${value.slice(selectionEnd)}`,
    );
    const caret = selectionStart + text.length;
    element.setSelectionRange(caret, caret);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  };
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
  });
  return () => Reflect.deleteProperty(document, "execCommand");
}

type Options = {
  readonly suggest?: boolean;
  readonly busy?: boolean;
  readonly canSubmit?: boolean;
};

/**
 * Mounts the hook over a real textarea whose text a host owns, so typing and
 * keys travel the same path a consumer's do: native events into React's
 * handlers, then `onValueChange` back into the host's state.
 */
function mountPrompt({
  suggest = true,
  busy = false,
  canSubmit,
}: Options = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const submitted: string[] = [];
  let prompt: UsePromptInputResult | undefined;
  let text = "";
  let setText: (next: string) => void = () => undefined;

  function Host() {
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    text = value;
    setText = setValue;
    prompt = usePromptInput({
      value,
      onValueChange: setValue,
      onSubmit: () => submitted.push(value),
      tokens: TOKENS,
      suggest,
      busy,
      disabled: false,
      canSubmit,
      textareaRef,
    });
    return createElement("textarea", {
      ref: textareaRef,
      value,
      ...prompt.textareaProps,
    });
  }

  act(() => {
    root.render(createElement(Host));
  });
  const textarea = container.querySelector("textarea");
  if (textarea === null) throw new Error("expected a textarea");

  return {
    textarea,
    /** Replaces the text as if typed, leaving the caret at `caret`, or at
     * the end. */
    type(next: string, caret = next.length) {
      act(() => {
        textarea.focus();
        setNativeValue?.call(textarea, next);
        textarea.setSelectionRange(caret, caret);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      });
    },
    /** Sets the text from the host's side, as a toolbar button would. */
    hostSet(next: string) {
      act(() => setText(next));
    },
    /** Dispatches a keydown; true when the textarea's default action ran.
     * `keyCode` is set on the event itself: `KeyboardEventInit` drops it. */
    press(
      key: string,
      { keyCode, ...init }: KeyboardEventInit & { keyCode?: number } = {},
    ): boolean {
      const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      });
      if (keyCode !== undefined) {
        Object.defineProperty(event, "keyCode", { value: keyCode });
      }
      let proceeded = true;
      act(() => {
        proceeded = textarea.dispatchEvent(event);
      });
      return proceeded;
    },
    get prompt(): UsePromptInputResult {
      if (prompt === undefined) throw new Error("hook did not render");
      return prompt;
    },
    get text() {
      return text;
    },
    submitted,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const ids = (tokens: readonly PromptToken[]) => tokens.map((token) => token.id);

describe("usePromptInput", () => {
  test("typing a trigger lists the matching tokens with the first current", () => {
    const view = mountPrompt();
    view.type("ask @a");
    expect(ids(view.prompt.suggestions)).toEqual(["ada", "adam", "alan"]);
    expect(view.prompt.activeSuggestion?.id).toBe("ada");
    view.type("ask @ad");
    expect(ids(view.prompt.suggestions)).toEqual(["ada", "adam"]);
    view.unmount();
  });

  test("ArrowDown and ArrowUp move through the list and wrap", () => {
    const view = mountPrompt();
    view.type("@a");
    expect(view.press("ArrowDown")).toBe(false);
    expect(view.prompt.activeSuggestion?.id).toBe("adam");
    view.press("ArrowDown");
    view.press("ArrowDown");
    expect(view.prompt.activeSuggestion?.id).toBe("ada");
    view.press("ArrowUp");
    expect(view.prompt.activeSuggestion?.id).toBe("alan");
    view.unmount();
  });

  test("the current suggestion keeps its row as the list narrows", () => {
    const view = mountPrompt();
    view.type("@a");
    view.press("ArrowDown");
    expect(view.prompt.activeSuggestion?.id).toBe("adam");
    view.type("@ad");
    expect(view.prompt.activeSuggestion?.id).toBe("adam");
    view.unmount();
  });

  test("Enter picks the current suggestion instead of submitting", () => {
    const view = mountPrompt();
    view.type("ask @a");
    view.press("ArrowDown");
    expect(view.press("Enter")).toBe(false);
    expect(view.text).toBe("ask @Adam ");
    expect(view.textarea.selectionStart).toBe("ask @Adam ".length);
    expect(view.prompt.suggestions).toEqual([]);
    expect(view.submitted).toEqual([]);
    view.unmount();
  });

  test.each([
    ["the browser's editing", true],
    ["a directly set value", false],
  ])(
    "a pick through %s leaves the caret past the token, so Enter then sends",
    (_path, browserEditing) => {
      const uninstall = browserEditing ? installInsertText() : undefined;
      const view = mountPrompt();
      try {
        view.type("ask @ad now", "ask @ad".length);
        view.press("Enter");
        expect(view.text).toBe("ask @Ada now");
        expect(view.textarea.selectionStart).toBe("ask @Ada ".length);
        expect(view.prompt.suggestions).toEqual([]);
        view.press("Enter");
        expect(view.submitted).toEqual(["ask @Ada now"]);

        view.type("ask @ad\nnext", "ask @ad".length);
        view.press("Enter");
        expect(view.text).toBe("ask @Ada \nnext");
        expect(view.textarea.selectionStart).toBe("ask @Ada ".length);
        expect(view.prompt.suggestions).toEqual([]);
      } finally {
        view.unmount();
        uninstall?.();
      }
    },
  );

  test("Tab picks too", () => {
    const view = mountPrompt();
    view.type("/b");
    view.press("Tab");
    expect(view.text).toBe("/brief ");
    view.unmount();
  });

  test("Escape closes the list until the token changes", () => {
    const view = mountPrompt();
    view.type("@a");
    expect(view.press("Escape")).toBe(false);
    expect(view.prompt.suggestions).toEqual([]);
    view.press("ArrowDown");
    expect(view.prompt.suggestions).toEqual([]);
    view.type("@ad");
    expect(ids(view.prompt.suggestions)).toEqual(["ada", "adam"]);
    view.unmount();
  });

  test("Escape holds only for the token it closed", () => {
    const view = mountPrompt();
    view.type("@a");
    view.press("Escape");
    view.type("@");
    view.type("");
    view.type("@");
    view.type("@a");
    expect(ids(view.prompt.suggestions)).toEqual(["ada", "adam", "alan"]);

    // With the list closed, Enter sends; the host then clears the draft.
    view.press("Escape");
    view.press("Enter");
    expect(view.submitted).toEqual(["@a"]);
    view.hostSet("");
    view.type("@a");
    expect(ids(view.prompt.suggestions)).toEqual(["ada", "adam", "alan"]);
    view.unmount();
  });

  test("the row the arrows chose does not carry into a later token", () => {
    const view = mountPrompt();
    view.type("@a");
    view.press("ArrowDown");
    view.press("ArrowDown");
    expect(view.prompt.activeSuggestion?.id).toBe("alan");
    view.type("@a ");
    view.type("@a hi @a");
    expect(view.prompt.activeSuggestion?.id).toBe("ada");
    view.unmount();
  });

  test("an open list marks Escape handled before a Radix layer sees it", () => {
    // Radix dialogs and popovers listen here and dismiss unless the Escape
    // is already marked handled.
    const seen: boolean[] = [];
    const layer = (event: KeyboardEvent) => {
      if (event.key === "Escape") seen.push(event.defaultPrevented);
    };
    document.addEventListener("keydown", layer, { capture: true });
    const view = mountPrompt();
    try {
      view.type("@a");
      view.press("Escape", { isComposing: true });
      view.press("Escape");
      expect(view.prompt.suggestions).toEqual([]);
      view.press("Escape");
      expect(seen).toEqual([false, true, false]);
    } finally {
      view.unmount();
      document.removeEventListener("keydown", layer, { capture: true });
    }
  });

  test("Enter with no list submits and keeps the newline out", () => {
    const view = mountPrompt();
    view.type("hello");
    expect(view.press("Enter")).toBe(false);
    expect(view.submitted).toEqual(["hello"]);
    view.unmount();
  });

  test("Shift+Enter leaves the newline to the textarea", () => {
    const view = mountPrompt();
    view.type("hello");
    expect(view.press("Enter", { shiftKey: true })).toBe(true);
    expect(view.submitted).toEqual([]);
    view.unmount();
  });

  test("Enter during IME composition neither submits nor picks", () => {
    const view = mountPrompt();
    view.type("にほん");
    expect(view.press("Enter", { isComposing: true })).toBe(true);
    view.type("@a");
    view.press("Enter", { isComposing: true });
    expect(view.text).toBe("@a");
    expect(view.submitted).toEqual([]);
    view.unmount();
  });

  test("the Enter Safari sends as a composition ends (keyCode 229) does not submit", () => {
    const view = mountPrompt();
    view.type("にほん");
    act(() => {
      view.textarea.dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true }),
      );
    });
    expect(view.press("Enter", { keyCode: 229 })).toBe(true);
    expect(view.submitted).toEqual([]);
    view.press("Enter", { keyCode: 13 });
    expect(view.submitted).toEqual(["にほん"]);
    view.unmount();
  });

  test("blank text, a held-down Enter or a busy prompt does not submit", () => {
    const view = mountPrompt();
    view.type("   ");
    view.press("Enter");
    view.type("hi");
    view.press("Enter", { repeat: true });
    expect(view.submitted).toEqual([]);
    view.unmount();

    const busy = mountPrompt({ busy: true });
    busy.type("hi");
    busy.press("Enter");
    expect(busy.prompt.canSubmit).toBe(false);
    expect(busy.submitted).toEqual([]);
    busy.unmount();
  });

  test("a host's canSubmit decides whether there is something to send", () => {
    const empty = mountPrompt({ canSubmit: true });
    expect(empty.prompt.canSubmit).toBe(true);
    expect(empty.press("Enter")).toBe(false);
    expect(empty.submitted).toEqual([""]);
    empty.unmount();

    const blocked = mountPrompt({ canSubmit: false });
    blocked.type("hi");
    expect(blocked.prompt.canSubmit).toBe(false);
    blocked.press("Enter");
    expect(blocked.submitted).toEqual([]);
    blocked.unmount();
  });

  test("canSubmit does not override busy or IME composition", () => {
    const busy = mountPrompt({ busy: true, canSubmit: true });
    expect(busy.prompt.canSubmit).toBe(false);
    busy.press("Enter");
    expect(busy.submitted).toEqual([]);
    busy.unmount();

    const composing = mountPrompt({ canSubmit: true });
    composing.press("Enter", { isComposing: true });
    expect(composing.submitted).toEqual([]);
    composing.unmount();
  });

  test("without a suggestion list the keys keep their usual meaning", () => {
    const view = mountPrompt({ suggest: false });
    view.type("@a");
    expect(view.prompt.suggestions).toEqual([]);
    expect(view.press("ArrowDown")).toBe(true);
    view.press("Enter");
    expect(view.submitted).toEqual(["@a"]);
    view.unmount();
  });

  test("a host-set value is read at the caret it leaves, not the last typed one", () => {
    const view = mountPrompt();
    view.type("hi");
    view.hostSet("hi @");
    expect(view.textarea.selectionStart).toBe(4);
    expect(ids(view.prompt.suggestions)).toEqual(["ada", "adam", "alan"]);
    view.unmount();

    // The caret typed last (6) sits right after "@ad" in the host's text,
    // but the textarea's caret is at the end, past any token.
    const stale = mountPrompt();
    stale.type("abcdef");
    stale.hostSet("xy @ad z");
    expect(stale.prompt.suggestions).toEqual([]);
    stale.unmount();
  });

  test("a host-set value does not open the list while the textarea is blurred", () => {
    const view = mountPrompt();
    view.type("hi");
    act(() => view.textarea.blur());
    view.hostSet("hi @");
    expect(view.prompt.suggestions).toEqual([]);
    view.unmount();
  });

  test("leaving the textarea closes the list", () => {
    const view = mountPrompt();
    view.type("@a");
    act(() => view.textarea.blur());
    expect(view.prompt.suggestions).toEqual([]);
    view.unmount();
  });
});
