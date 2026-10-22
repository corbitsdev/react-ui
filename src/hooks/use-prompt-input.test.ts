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

  function Host() {
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    text = value;
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
  const setNativeValue = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;

  return {
    textarea,
    /** Replaces the text as if typed, leaving the caret at its end. */
    type(next: string) {
      act(() => {
        textarea.focus();
        setNativeValue?.call(textarea, next);
        textarea.setSelectionRange(next.length, next.length);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      });
    },
    /** Dispatches a keydown; true when the textarea's default action ran. */
    press(key: string, init: KeyboardEventInit = {}): boolean {
      let proceeded = true;
      act(() => {
        proceeded = textarea.dispatchEvent(
          new KeyboardEvent("keydown", {
            key,
            bubbles: true,
            cancelable: true,
            ...init,
          }),
        );
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

  test("leaving the textarea closes the list", () => {
    const view = mountPrompt();
    view.type("@a");
    act(() => view.textarea.blur());
    expect(view.prompt.suggestions).toEqual([]);
    view.unmount();
  });
});
