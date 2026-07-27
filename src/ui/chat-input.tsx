import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "../lib/utils.js";

export type ChatAttachment = {
  readonly id: string;
  readonly name: string;
};

export type ChatInputProps = {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onSend: () => void;
  /** Shown while the agent is replying. Its presence turns send into stop. */
  readonly onStop?: () => void;
  readonly working?: boolean;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly attachments?: readonly ChatAttachment[];
  readonly onAttach?: (files: FileList) => void;
  readonly onRemoveAttachment?: (attachment: ChatAttachment) => void;
  readonly className?: string;
};

const MAX_ROWS_PX = 200;

/**
 * The composer.
 *
 * Enter sends and Shift+Enter breaks the line — the convention every chat app
 * shares, and breaking it costs users a message. IME composition is excluded:
 * mid-composition Enter commits a candidate in Japanese and Chinese input, and
 * treating that as "send" fires a half-typed message.
 *
 * While the agent is replying, the send button becomes stop. Two buttons would
 * mean one is always dead, and a stop control that appears somewhere else is one
 * the user has to hunt for at the moment they most want it.
 *
 * The textarea grows with its content up to a cap, then scrolls. It is measured
 * rather than counted in rows, because a wrapped long line takes more height
 * than its newline count implies.
 */
export function ChatInput({
  value,
  onValueChange,
  onSend,
  onStop,
  working = false,
  placeholder = "Send a message…",
  disabled = false,
  attachments = [],
  onAttach,
  onRemoveAttachment,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const node = textareaRef.current;
    if (node === null) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, MAX_ROWS_PX)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !disabled;
  const showStop = working && onStop !== undefined;

  const submit = () => {
    if (!canSend) return;
    onSend();
  };

  return (
    <form
      className={cn("flex flex-col gap-2 rounded-lg border border-input bg-background p-2", className)}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {attachments.length === 0 ? null : (
        <ul aria-label="Attachments" className="flex flex-wrap gap-1.5">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-1.5 rounded-md bg-muted py-1 pr-1 pl-2 text-xs"
            >
              <span className="max-w-40 truncate">{attachment.name}</span>
              {onRemoveAttachment === undefined ? null : (
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(attachment)}
                  aria-label={`Remove ${attachment.name}`}
                  className="grid size-5 place-items-center rounded-sm text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        {onAttach === undefined ? null : (
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="sr-only"
              onChange={(event) => {
                if (event.target.files !== null) onAttach(event.target.files);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={disabled}
              aria-label="Attach files"
              className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <Paperclip className="size-4" aria-hidden />
            </button>
          </>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Message"
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            // `isComposing` is the IME guard — without it, committing a
            // Japanese or Chinese candidate sends the message instead.
            if (event.nativeEvent.isComposing) return;
            event.preventDefault();
            submit();
          }}
          className="max-h-50 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />

        {showStop ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-foreground transition-colors hover:bg-secondary"
          >
            <Square className="size-3.5 fill-current" aria-hidden />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary-active disabled:opacity-40"
          >
            <ArrowUp className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </form>
  );
}
