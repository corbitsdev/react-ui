import { describe, expect, test } from "bun:test";
import { act, type ReactNode, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

import type { PromptToken } from "../lib/prompt-tokens.js";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputSuggestion,
  PromptInputSuggestions,
  PromptInputTextarea,
  type PromptInputStatus,
} from "./prompt-input.js";

const TOKENS: readonly PromptToken[] = [
  { id: "ada", kind: "mention", token: "@Ada", detail: "Research agent" },
  { id: "alan", kind: "mention", token: "@Alan" },
  { id: "brief", kind: "command", token: "/brief" },
];

type HostProps = {
  readonly initial?: string;
  readonly status?: PromptInputStatus;
  readonly suggestions?: boolean;
  readonly renderSuggestion?: (token: PromptToken) => ReactNode;
  readonly submitLabel?: string;
  readonly listId?: string;
  readonly canSubmit?: boolean;
  readonly disabled?: boolean;
  readonly events: string[];
};

function Host({
  initial = "",
  status = "ready",
  suggestions = true,
  renderSuggestion,
  submitLabel,
  listId,
  canSubmit,
  disabled,
  events,
}: HostProps) {
  const [value, setValue] = useState(initial);
  return (
    <PromptInput
      value={value}
      onValueChange={setValue}
      onSubmit={() => events.push(`submit:${value}`)}
      tokens={TOKENS}
      status={status}
      {...(canSubmit === undefined ? {} : { canSubmit })}
      {...(disabled === undefined ? {} : { disabled })}
    >
      {!suggestions ? null : renderSuggestion === undefined ? (
        // A plain-JS host can still pass `id`; the listbox keeps its own.
        <PromptInputSuggestions
          {...(listId === undefined ? {} : ({ id: listId } as object))}
        />
      ) : (
        <PromptInputSuggestions>{renderSuggestion}</PromptInputSuggestions>
      )}
      <PromptInputTextarea />
      <PromptInputSubmit
        aria-label={submitLabel}
        onStop={() => events.push("stop")}
      />
    </PromptInput>
  );
}

function render(props: HostProps) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(<Host {...props} />);
  });
  const textarea = container.querySelector("textarea");
  const button = container.querySelector("button");
  if (textarea === null || button === null) throw new Error("expected parts");
  const setNativeValue = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  return {
    container,
    textarea,
    button,
    type(next: string) {
      act(() => {
        textarea.focus();
        setNativeValue?.call(textarea, next);
        textarea.setSelectionRange(next.length, next.length);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      });
    },
    press(key: string) {
      act(() => {
        textarea.dispatchEvent(
          new KeyboardEvent("keydown", {
            key,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
    },
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("PromptInput", () => {
  test("the mirror is hidden from assistive tech and highlights known tokens", () => {
    const view = render({ initial: "/brief for @Ada and @Adam", events: [] });
    const mirror = view.container.querySelector(
      "[data-slot='prompt-input-mirror']",
    );
    expect(mirror?.getAttribute("aria-hidden")).toBe("true");
    const marks = [...view.container.querySelectorAll("mark")].map(
      (mark) => mark.textContent,
    );
    expect(marks).toEqual(["/brief", "@Ada"]);
    expect(mirror?.textContent).toBe("/brief for @Ada and @Adam" + "\u200B");
    view.unmount();
  });

  test("Send is aria-disabled until there is text, then submits", () => {
    const events: string[] = [];
    const view = render({ events });
    expect(view.button.getAttribute("aria-label")).toBe("Send");
    expect(view.button.getAttribute("aria-disabled")).toBe("true");
    view.type("hello");
    expect(view.button.hasAttribute("aria-disabled")).toBe(false);
    act(() => view.button.click());
    view.press("Enter");
    expect(events).toEqual(["submit:hello", "submit:hello"]);
    view.unmount();
  });

  test("with nothing to send, Send keeps focus and a click sends nothing", () => {
    const events: string[] = [];
    const view = render({ events });
    // `disabled` would drop focus to the page as Send turns unsendable.
    expect(view.button.disabled).toBe(false);
    act(() => view.button.focus());
    act(() => view.button.click());
    expect(events).toEqual([]);
    expect(document.activeElement).toBe(view.button);
    view.unmount();
  });

  test("a disabled PromptInput disables Send for real", () => {
    const view = render({ initial: "hello", disabled: true, events: [] });
    expect(view.button.disabled).toBe(true);
    view.unmount();
  });

  test("canSubmit lets an empty prompt send, as with only attachments", () => {
    const events: string[] = [];
    const view = render({ canSubmit: true, events });
    expect(view.button.hasAttribute("aria-disabled")).toBe(false);
    view.press("Enter");
    act(() => view.button.click());
    expect(events).toEqual(["submit:", "submit:"]);
    view.unmount();
  });

  test("canSubmit false keeps Send aria-disabled and Enter inert despite text", () => {
    const events: string[] = [];
    const view = render({ initial: "hello", canSubmit: false, events });
    expect(view.button.getAttribute("aria-disabled")).toBe("true");
    view.press("Enter");
    act(() => view.button.click());
    expect(events).toEqual([]);
    view.unmount();
  });

  test("canSubmit does not send while a reply is in flight", () => {
    const events: string[] = [];
    const view = render({ status: "submitted", canSubmit: true, events });
    view.press("Enter");
    expect(events).toEqual([]);
    view.unmount();
  });

  test("while streaming, Send becomes Stop and Enter does not submit", () => {
    const events: string[] = [];
    const view = render({ initial: "next", status: "streaming", events });
    expect(view.button.getAttribute("aria-label")).toBe("Stop");
    expect(view.button.type).toBe("button");
    act(() => view.button.click());
    view.press("Enter");
    expect(events).toEqual(["stop"]);
    view.unmount();
  });

  test("suggestions list the matches and the textarea points at the current one", () => {
    const view = render({ events: [] });
    view.type("@a");
    const list = view.container.querySelector("[role='listbox']");
    expect(list?.getAttribute("aria-label")).toBe("Mentions");
    const options = [...view.container.querySelectorAll("[role='option']")];
    expect(options.map((option) => option.textContent)).toEqual([
      "@AdaResearch agent",
      "@Alan",
    ]);
    expect(view.textarea.getAttribute("aria-controls")).toBe(list?.id ?? "");
    expect(view.textarea.getAttribute("aria-activedescendant")).toBe(
      options[0]?.id ?? "",
    );
    view.press("ArrowDown");
    expect(options[1]?.getAttribute("aria-selected")).toBe("true");
    expect(view.textarea.getAttribute("aria-activedescendant")).toBe(
      options[1]?.id ?? "",
    );
    view.unmount();
  });

  test("the textarea offers list completion only with a suggestions part", () => {
    const without = render({ suggestions: false, events: [] });
    expect(without.textarea.hasAttribute("aria-autocomplete")).toBe(false);
    expect(without.textarea.hasAttribute("aria-haspopup")).toBe(false);
    without.unmount();

    // A capability, so set while the list is closed too.
    const view = render({ events: [] });
    expect(view.container.querySelector("[role='listbox']")).toBeNull();
    expect(view.textarea.getAttribute("aria-autocomplete")).toBe("list");
    expect(view.textarea.getAttribute("aria-haspopup")).toBe("listbox");
    view.unmount();
  });

  test("a status announces the list opening, narrowing and closing", () => {
    const view = render({ events: [] });
    const status = view.container.querySelector("[role='status']");
    expect(status?.textContent).toBe("");
    view.type("@a");
    expect(status?.textContent).toBe("2 suggestions");
    view.type("@al");
    expect(status?.textContent).toBe("1 suggestion");
    view.press("Escape");
    expect(view.container.querySelector("[role='listbox']")).toBeNull();
    // The same node throughout: a live region mounted with its text is not
    // reliably read.
    expect(view.container.querySelector("[role='status']")).toBe(status);
    expect(status?.textContent).toBe("");
    view.unmount();
  });

  test("a render callback that skips PromptInputSuggestion is reported in development", () => {
    const errors: unknown[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => errors.push(args[0]);
    try {
      const fine = render({
        events: [],
        renderSuggestion: (token) => <PromptInputSuggestion token={token} />,
      });
      fine.type("@a");
      fine.unmount();
      expect(errors).toEqual([]);

      const bare = render({
        events: [],
        renderSuggestion: (token) => (
          <li role="option" aria-selected={false}>
            {token.token}
          </li>
        ),
      });
      bare.type("@a");
      bare.unmount();
    } finally {
      console.error = originalError;
    }
    expect(errors).toEqual([
      expect.stringContaining("must return a PromptInputSuggestion"),
    ]);
  });

  test("clicking a suggestion picks it", () => {
    const view = render({ events: [] });
    view.type("@a");
    const option =
      view.container.querySelectorAll<HTMLElement>("[role='option']")[1];
    act(() => option?.click());
    expect(view.textarea.value).toBe("@Alan ");
    expect(view.container.querySelector("[role='listbox']")).toBeNull();
    expect(view.textarea.hasAttribute("aria-controls")).toBe(false);
    view.unmount();
  });

  test("a press anywhere in the list leaves focus in the textarea", () => {
    // Its padding, the gaps between rows and its scrollbar belong to the
    // list, not to an option; a press there must not blur the textarea.
    const view = render({ events: [] });
    view.type("@a");
    const list = view.container.querySelector<HTMLElement>("[role='listbox']");
    const option = view.container.querySelector<HTMLElement>("[role='option']");
    const press = (target: HTMLElement | null) =>
      target?.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
      );
    expect(press(list)).toBe(false);
    expect(press(option)).toBe(false);
    view.unmount();
  });

  test("a host aria-label names the submit button in either state", () => {
    const send = render({ submitLabel: "Envoyer", events: [] });
    expect(send.button.getAttribute("aria-label")).toBe("Envoyer");
    send.unmount();
    const stop = render({
      initial: "next",
      status: "streaming",
      submitLabel: "Arrêter",
      events: [],
    });
    expect(stop.button.getAttribute("aria-label")).toBe("Arrêter");
    stop.unmount();
  });

  test("a host onClick on a suggestion runs and the suggestion is still picked", () => {
    const events: string[] = [];
    const view = render({
      events,
      renderSuggestion: (token) => (
        <PromptInputSuggestion
          token={token}
          onClick={() => events.push(`click:${token.id}`)}
        />
      ),
    });
    view.type("@a");
    const option =
      view.container.querySelectorAll<HTMLElement>("[role='option']")[1];
    act(() => option?.click());
    expect(events).toEqual(["click:alan"]);
    expect(view.textarea.value).toBe("@Alan ");
    view.unmount();
  });

  test("a host onClick that prevents default keeps the suggestion unpicked", () => {
    const view = render({
      events: [],
      renderSuggestion: (token) => (
        <PromptInputSuggestion
          token={token}
          onClick={(event) => event.preventDefault()}
        />
      ),
    });
    view.type("@a");
    const option =
      view.container.querySelectorAll<HTMLElement>("[role='option']")[1];
    act(() => option?.click());
    expect(view.textarea.value).toBe("@a");
    view.unmount();
  });

  test("a host id on a suggestion does not break aria-activedescendant", () => {
    const view = render({
      events: [],
      renderSuggestion: (token) => (
        <PromptInputSuggestion
          token={token}
          // A plain-JS host can still pass `id`; the option keeps its own.
          {...({ id: `host-${token.id}` } as object)}
        />
      ),
    });
    view.type("@a");
    const options = [
      ...view.container.querySelectorAll<HTMLElement>("[role='option']"),
    ];
    expect(options[0]?.id.startsWith("host-")).toBe(false);
    const current = view.textarea.getAttribute("aria-activedescendant") ?? "";
    expect(current).toBe(options[0]?.id ?? "");
    expect(document.getElementById(current)).toBe(options[0] ?? null);
    view.unmount();
  });

  test("a host id on the suggestions list does not break aria-controls", () => {
    const view = render({ listId: "host-list", events: [] });
    view.type("@a");
    const list = view.container.querySelector<HTMLElement>("[role='listbox']");
    expect(list?.id).not.toBe("host-list");
    const controls = view.textarea.getAttribute("aria-controls") ?? "";
    expect(controls).toBe(list?.id ?? "");
    expect(document.getElementById(controls)).toBe(list);
    view.unmount();
  });

  test("without the suggestions part there is no list and arrows are left alone", () => {
    const events: string[] = [];
    const view = render({ suggestions: false, events });
    view.type("@a");
    expect(view.container.querySelector("[role='listbox']")).toBeNull();
    view.press("Enter");
    expect(events).toEqual(["submit:@a"]);
    view.unmount();
  });
});
