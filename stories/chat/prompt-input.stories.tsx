import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { PromptToken } from "../../src/lib/prompt-tokens.js";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputSuggestions,
  PromptInputTextarea,
  type PromptInputStatus,
} from "../../src/ui/prompt-input.js";

export default { title: "Chat / Prompt input" };

const TOKENS: readonly PromptToken[] = [
  {
    id: "researcher",
    kind: "mention",
    token: "@Researcher",
    detail: "Finds and cites sources",
  },
  {
    id: "reviewer",
    kind: "mention",
    token: "@Reviewer",
    detail: "Checks work before it ships",
  },
  {
    id: "planner",
    kind: "mention",
    token: "@Planner",
    detail: "Breaks a goal into steps",
  },
  {
    id: "summarize",
    kind: "command",
    token: "/summarize",
    detail: "Summarize the thread",
  },
  { id: "plan", kind: "command", token: "/plan", detail: "Draft a plan" },
];

const LONG_DRAFT = Array.from(
  { length: 14 },
  (_, index) =>
    `Line ${index + 1}: notes for @Reviewer on the release checklist.`,
).join("\n");

/** Room above the box, where the suggestion list opens. */
function Frame({ children }: { readonly children: ReactNode }) {
  return <div className="max-w-xl pt-56">{children}</div>;
}

function Prompt({
  initial = "",
  status = "ready",
  disabled = false,
  focusAtEnd = false,
}: {
  readonly initial?: string;
  readonly status?: PromptInputStatus;
  readonly disabled?: boolean;
  /** Focus the box with the caret after the text, as if just typed. */
  readonly focusAtEnd?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!focusAtEnd || textarea === null) return;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [focusAtEnd]);
  return (
    <Frame>
      <PromptInput
        value={value}
        onValueChange={setValue}
        onSubmit={() => setValue("")}
        tokens={TOKENS}
        status={status}
        disabled={disabled}
      >
        <PromptInputSuggestions />
        <PromptInputTextarea
          ref={textareaRef}
          placeholder="Ask an agent… (@ to mention, / for commands)"
        />
        <PromptInputSubmit onStop={() => undefined} />
      </PromptInput>
    </Frame>
  );
}

/** Empty, waiting for a message. Type `@` or `/` to see suggestions. */
export const Plain = () => <Prompt />;

/** A draft with a command and a mention, each highlighted where it was typed. */
export const WithTokens = () => (
  <Prompt initial={"/summarize the last run for @Researcher and @Planner"} />
);

/** The caret is in `@` + "re", so the mentions it could become are listed. */
export const SuggestionsOpen = () => <Prompt initial="Ask @Re" focusAtEnd />;

/** Commands are suggested only at the start of a line. */
export const CommandSuggestions = () => <Prompt initial="/" focusAtEnd />;

/** While the agent replies, Send is Stop and Enter does not send. */
export const Replying = () => (
  <Prompt initial="Next, compare it with last week" status="streaming" />
);

/** Grown to its max height; past it the text scrolls, highlights and all. */
export const LongDraft = () => <Prompt initial={LONG_DRAFT} />;

export const Disabled = () => <Prompt initial="Waiting for access" disabled />;
