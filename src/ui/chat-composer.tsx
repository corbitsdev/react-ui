import { useRef } from "react";

import { useDelayedAutofocus } from "../hooks/use-delayed-autofocus.js";
import type { QuickReply } from "../lib/chat-message.js";
import { cn } from "../lib/utils.js";
import { ChatInput, type ChatInputProps } from "./chat-input.js";
import { QuickReplyChips } from "./quick-reply-chips.js";

export type ChatComposerProps = Omit<ChatInputProps, "working" | "disabled" | "textareaRef"> & {
  /** Suggestion chips shown above the input while the conversation is empty. */
  readonly suggestions?: readonly QuickReply[];
  readonly onSuggestionSelect?: (reply: QuickReply) => void;
  /** True while a response is in flight — disables the input, same signal `ChatInput` calls `working`. */
  readonly busy?: boolean;
  /**
   * Flips true→false or false→true to (re)trigger the autofocus timer — pass
   * the dock's `mode !== "closed"` so it fires once per open, after the
   * panel's own entrance animation has settled (see `chat-dock-timing.ts`).
   */
  readonly autoFocusOn?: boolean;
  readonly className?: string;
};

/**
 * The composer: suggestion chips above an empty conversation, otherwise just
 * the input. Chips and input are mutually exclusive rather than stacked
 * always-on, because a suggestion list next to ten prior turns is not a
 * suggestion anymore — it is clutter competing with what the user already
 * said.
 */
export function ChatComposer({
  suggestions = [],
  onSuggestionSelect,
  busy = false,
  autoFocusOn = false,
  className,
  ...inputProps
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useDelayedAutofocus(textareaRef, autoFocusOn);

  const showSuggestions = suggestions.length > 0 && onSuggestionSelect !== undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {showSuggestions ? (
        <QuickReplyChips replies={suggestions} onSelect={onSuggestionSelect} />
      ) : null}
      <ChatInput {...inputProps} working={busy} disabled={busy} textareaRef={textareaRef} />
    </div>
  );
}
