import { AtSign, AudioLines, Paperclip, SquareSlash } from "lucide-react";
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
import {
  PromptInputAddMenu,
  PromptInputButton,
  PromptInputContext,
  PromptInputFloat,
  PromptInputModeSelect,
  PromptInputModelSelect,
  PromptInputNote,
  PromptInputToolbar,
  type PromptInputModelOption,
  type PromptInputModeOption,
} from "../../src/ui/prompt-input-toolbar.js";

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

const MODELS: readonly PromptInputModelOption[] = [
  {
    id: "swift",
    name: "Swift 2",
    short: "Swift",
    detail: "Quick answers",
    group: "Fast",
  },
  {
    id: "lite",
    name: "Lite 1",
    short: "Lite",
    detail: "Lowest cost",
    group: "Fast",
  },
  {
    id: "deep",
    name: "Deep 4",
    short: "Deep",
    detail: "Careful, slower reasoning",
    group: "Thorough",
  },
];

const MODES: readonly PromptInputModeOption[] = [
  { id: "ask", label: "Ask", detail: "Answers without taking action" },
  { id: "plan", label: "Plan", detail: "Drafts steps for you to approve" },
  { id: "agent", label: "Agent", detail: "Acts on your behalf" },
];

type ToolbarPromptProps = {
  readonly addMenu?: boolean;
  readonly mode?: boolean;
  readonly model?: boolean;
  readonly voice?: boolean;
  readonly replying?: boolean;
  readonly note?: boolean;
  readonly openPicker?: "model" | "mode" | "add";
  readonly disabled?: boolean;
};

/** A prompt with whichever toolbar parts are switched on. */
function ToolbarPrompt({
  addMenu = false,
  mode = false,
  model = false,
  voice = false,
  replying = false,
  note = false,
  openPicker,
  disabled = false,
}: ToolbarPromptProps) {
  const [value, setValue] = useState("");
  const [modelId, setModelId] = useState("deep");
  const [modeId, setModeId] = useState("agent");
  const [context, setContext] = useState(replying);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const startToken = (prefix: string) => {
    setValue(
      (draft) =>
        (draft === "" || draft.endsWith(" ") ? draft : `${draft} `) + prefix,
    );
    textareaRef.current?.focus();
  };
  const toolbar = addMenu || mode || model || voice;
  return (
    <Frame>
      <PromptInput
        value={value}
        onValueChange={setValue}
        onSubmit={() => setValue("")}
        tokens={TOKENS}
        disabled={disabled}
      >
        {context ? (
          <PromptInputFloat>
            <PromptInputContext
              label="Replying to"
              detail="Researcher: the Q3 summary"
              clearLabel="Stop replying"
              onClear={() => setContext(false)}
            />
          </PromptInputFloat>
        ) : null}
        <PromptInputSuggestions />
        <PromptInputTextarea
          ref={textareaRef}
          placeholder={
            mode && modeId === "plan"
              ? "Describe the goal to plan…"
              : "Ask an agent… (@ to mention, / for commands)"
          }
        />
        {toolbar ? (
          <PromptInputToolbar>
            {addMenu ? (
              <PromptInputAddMenu
                disabled={disabled}
                defaultOpen={openPicker === "add"}
                items={[
                  {
                    id: "files",
                    label: "Add files or photos",
                    icon: <Paperclip />,
                    onSelect: () => undefined,
                  },
                  {
                    id: "mention",
                    label: "Mention an agent",
                    icon: <AtSign />,
                    onSelect: () => startToken("@"),
                  },
                  {
                    id: "command",
                    label: "Use a command",
                    icon: <SquareSlash />,
                    onSelect: () => startToken("/"),
                  },
                ]}
              />
            ) : null}
            {mode ? (
              <PromptInputModeSelect
                modes={MODES}
                value={modeId}
                onValueChange={setModeId}
                disabled={disabled}
                defaultOpen={openPicker === "mode"}
              />
            ) : null}
            <div className="ms-auto flex items-center gap-1">
              {model ? (
                <PromptInputModelSelect
                  models={MODELS}
                  value={modelId}
                  onValueChange={setModelId}
                  disabled={disabled}
                  defaultOpen={openPicker === "model"}
                />
              ) : null}
              {voice ? (
                <PromptInputButton aria-label="Voice mode" disabled={disabled}>
                  <AudioLines className="size-4" aria-hidden />
                </PromptInputButton>
              ) : null}
              <PromptInputSubmit onStop={() => undefined} />
            </div>
          </PromptInputToolbar>
        ) : (
          <PromptInputSubmit onStop={() => undefined} />
        )}
      </PromptInput>
      {note ? (
        <PromptInputNote>
          Agents can make mistakes. Check important work.
        </PromptInputNote>
      ) : null}
    </Frame>
  );
}

/** Every optional part on: add menu, mode and model pickers, voice, the
 * reply chip floating above and the note below. */
export const EverythingOn = () => (
  <ToolbarPrompt addMenu mode model voice replying note />
);

/** The model picker open, grouped, with the chosen model checked. */
export const ModelPickerOpen = () => (
  <ToolbarPrompt addMenu mode model openPicker="model" />
);

/** The mode picker open on the current mode. */
export const ModePickerOpen = () => (
  <ToolbarPrompt addMenu mode model openPicker="mode" />
);

/** The `+` menu open: files, a mention, a command. */
export const AddMenuOpen = () => (
  <ToolbarPrompt addMenu model openPicker="add" />
);

/** Small print under the box; nothing else added. */
export const WithNote = () => <ToolbarPrompt note />;

/** The chip says what the next message answers; its button clears it. */
export const ReplyingChip = () => <ToolbarPrompt replying />;

/** Disabled: the host passes `disabled` to the toolbar parts as well as
 * to the prompt. */
export const ToolbarDisabled = () => (
  <ToolbarPrompt addMenu mode model voice disabled />
);
