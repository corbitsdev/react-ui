import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";

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
  /**
   * Holding the send button fires this instead of sending — the heavier
   * alternative gesture (send back, send-and-…) that shares the button
   * because it is a send, not a separate action. The click that ends the
   * hold is swallowed so it never sends on release. There is no keyboard
   * hold, so whatever this opens must be reachable another way too.
   */
  readonly onSendHold?: () => void;
  /** How long a press counts as a hold. Defaults to 450ms. */
  readonly sendHoldMs?: number;
  readonly working?: boolean;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly attachments?: readonly ChatAttachment[];
  readonly onAttach?: (files: FileList) => void;
  readonly onRemoveAttachment?: (attachment: ChatAttachment) => void;
  /** Exposes the textarea node — a host that autofocuses on open needs something to focus. */
  readonly textareaRef?: RefObject<HTMLTextAreaElement | null>;
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
  onSendHold,
  sendHoldMs = 450,
  working = false,
  placeholder = "Send a message…",
  disabled = false,
  attachments = [],
  onAttach,
  onRemoveAttachment,
  textareaRef: externalTextareaRef,
  className,
}: ChatInputProps) {
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef ?? internalTextareaRef;
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const node = textareaRef.current;
    if (node === null) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, MAX_ROWS_PX)}px`;
  }, [value]);

  useEffect(() => releaseHold, []);

  const canSend = value.trim().length > 0 && !disabled;
  const showStop = working && onStop !== undefined;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set when a hold fires so the click that ends the press does not send.
  const heldRef = useRef(false);

  const submit = () => {
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    if (!canSend) return;
    onSend();
  };

  const releaseHold = () => {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
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
            disabled={!canSend && onSendHold === undefined}
            aria-label="Send message"
            {...(onSendHold === undefined
              ? {}
              : {
                  onPointerDown: () => {
                    releaseHold();
                    // A hold released off the button never produces the
                    // click that consumes this — reset it per press so it
                    // cannot swallow a later normal send.
                    heldRef.current = false;
                    holdTimer.current = setTimeout(() => {
                      heldRef.current = true;
                      holdTimer.current = null;
                      onSendHold();
                    }, sendHoldMs);
                  },
                  onPointerUp: releaseHold,
                  onPointerLeave: releaseHold,
                  onPointerCancel: releaseHold,
                })}
            className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary-active disabled:opacity-40"
          >
            <ArrowUp className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </form>
  );
}
