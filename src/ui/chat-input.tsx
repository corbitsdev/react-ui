import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import {
  useEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";

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
  /** Replaces the default paperclip on the attach control. Ignored when `onAttach` is omitted. */
  readonly attachIcon?: ReactNode;
  /** Replaces the default arrow on the send control. The stop control is unchanged. */
  readonly sendIcon?: ReactNode;
  /**
   * Extra controls in the footer tools row, after attach. A host that needs a
   * dictate button (or any other leading action) passes it here instead of
   * overlaying the composer with CSS.
   */
  readonly leadingTools?: ReactNode;
  /** Extra controls in the footer, immediately before send/stop. */
  readonly trailingTools?: ReactNode;
  readonly className?: string;
};

export type ChatInputRootProps = ComponentProps<"form">;
export type ChatInputHeaderProps = ComponentProps<"div">;
export type ChatInputBodyProps = ComponentProps<"div">;
export type ChatInputFooterProps = ComponentProps<"div">;
export type ChatInputToolsProps = ComponentProps<"div">;
export type ChatInputButtonProps = ComponentProps<"button">;

export type ChatInputTextareaProps = Omit<ComponentProps<"textarea">, "ref"> & {
  readonly onValueChange?: (value: string) => void;
  readonly onSend?: () => void;
  readonly textareaRef?: RefObject<HTMLTextAreaElement | null>;
};

export type ChatInputSubmitProps = Omit<ComponentProps<"button">, "type" | "children"> & {
  readonly onStop?: () => void;
  readonly working?: boolean;
  readonly sendIcon?: ReactNode;
  /** When false, send is disabled. Omit to leave enablement to `disabled`. */
  readonly canSend?: boolean;
  readonly onSendHold?: () => void;
  /** How long a press counts as a hold. Defaults to 450ms. */
  readonly sendHoldMs?: number;
};

export type ChatInputAttachProps = {
  readonly onAttach: (files: FileList) => void;
  readonly icon?: ReactNode;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly accept?: string;
  readonly multiple?: boolean;
};

const MAX_ROWS_PX = 200;

const defaultAttachIcon = <Paperclip className="size-4" aria-hidden />;
const defaultSendIcon = <ArrowUp className="size-4" aria-hidden />;

const toolButtonClass =
  "inline-flex size-9 shrink-0 items-center justify-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50";

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
 *
 * Callers that need extra footer controls (dictate, model picker, …) pass
 * `leadingTools` / `trailingTools`, or compose the named slots instead of
 * this all-in-one. Omit the extras and the composer looks as it did.
 *
 * Holding send fires `onSendHold` instead of sending. The click that ends the
 * hold is swallowed so it never sends on release.
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
  attachIcon = defaultAttachIcon,
  sendIcon = defaultSendIcon,
  leadingTools,
  trailingTools,
  className,
}: ChatInputProps) {
  const canSend = value.trim().length > 0 && !disabled;
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

  return (
    <ChatInputRoot className={className} onSubmit={submit}>
      {attachments.length === 0 ? null : (
        <ChatInputHeader>
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
        </ChatInputHeader>
      )}

      <ChatInputBody>
        <ChatInputTextarea
          value={value}
          onValueChange={onValueChange}
          onSend={submit}
          disabled={disabled}
          placeholder={placeholder}
          textareaRef={externalTextareaRef}
        />
      </ChatInputBody>

      <ChatInputFooter>
        <ChatInputTools>
          {onAttach === undefined ? null : (
            <ChatInputAttach onAttach={onAttach} icon={attachIcon} disabled={disabled} />
          )}
          {leadingTools}
        </ChatInputTools>
        {trailingTools}
        <ChatInputSubmit
          onStop={onStop}
          working={working}
          sendIcon={sendIcon}
          canSend={canSend}
          sendHoldMs={sendHoldMs}
          {...(onSendHold === undefined
            ? {}
            : {
                onSendHold: () => {
                  heldRef.current = true;
                  onSendHold();
                },
              })}
        />
      </ChatInputFooter>
    </ChatInputRoot>
  );
}

/** Form shell. `className` lands on the bordered box. Submit is always `preventDefault`'d. */
export function ChatInputRoot({ className, onSubmit, ...props }: ChatInputRootProps) {
  return (
    <form
      data-slot="chat-input-root"
      {...props}
      className={cn("flex flex-col gap-2 rounded-lg border border-input bg-background p-2", className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(event);
      }}
    />
  );
}

/** Attachments row, or any extra header above the textarea. */
export function ChatInputHeader({ className, ...props }: ChatInputHeaderProps) {
  return <div data-slot="chat-input-header" className={cn(className)} {...props} />;
}

/** Textarea region. */
export function ChatInputBody({ className, ...props }: ChatInputBodyProps) {
  return <div data-slot="chat-input-body" className={cn("min-h-9", className)} {...props} />;
}

/**
 * Auto-resizing message field. Enter sends, Shift+Enter breaks the line, IME
 * composition is ignored. Pass `onSend` or let Enter `requestSubmit` the form.
 */
export function ChatInputTextarea({
  value,
  onValueChange,
  onSend,
  onChange,
  onKeyDown,
  disabled = false,
  placeholder = "Send a message…",
  textareaRef: externalTextareaRef,
  className,
  rows = 1,
  ...props
}: ChatInputTextareaProps) {
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef ?? internalTextareaRef;

  useEffect(() => {
    const node = textareaRef.current;
    if (node === null) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, MAX_ROWS_PX)}px`;
  }, [value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      data-slot="chat-input-textarea"
      value={value}
      rows={rows}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={props["aria-label"] ?? "Message"}
      onChange={(event) => {
        onValueChange?.(event.target.value);
        onChange?.(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key !== "Enter" || event.shiftKey) return;
        // `isComposing` is the IME guard — without it, committing a
        // Japanese or Chinese candidate sends the message instead.
        if (event.nativeEvent.isComposing) return;
        event.preventDefault();
        if (onSend !== undefined) {
          onSend();
          return;
        }
        const form = event.currentTarget.form;
        const submitButton = form?.querySelector('button[type="submit"]');
        if (submitButton instanceof HTMLButtonElement && submitButton.disabled) return;
        form?.requestSubmit();
      }}
      className={cn(
        "max-h-50 min-h-9 w-full resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50",
        className,
      )}
    />
  );
}

/** Tools on the left, submit on the right. */
export function ChatInputFooter({ className, ...props }: ChatInputFooterProps) {
  return (
    <div
      data-slot="chat-input-footer"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  );
}

/** Arbitrary leading actions (attach, plus, mic, menus). Grows so submit stays right. */
export function ChatInputTools({ className, ...props }: ChatInputToolsProps) {
  return (
    <div
      data-slot="chat-input-tools"
      className={cn("flex min-w-0 flex-1 items-center gap-1", className)}
      {...props}
    />
  );
}

/** Ghost icon or text tool button. Defaults to `type="button"` so it cannot submit. */
export function ChatInputButton({ className, type = "button", ...props }: ChatInputButtonProps) {
  return (
    <button
      type={type}
      data-slot="chat-input-button"
      className={cn(toolButtonClass, className)}
      {...props}
    />
  );
}

/** Hidden file input plus the attach button. Optional `icon` replaces the paperclip. */
export function ChatInputAttach({
  onAttach,
  icon = defaultAttachIcon,
  disabled = false,
  className,
  accept,
  multiple = true,
}: ChatInputAttachProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          if (event.target.files !== null) onAttach(event.target.files);
          event.target.value = "";
        }}
      />
      <ChatInputButton
        disabled={disabled}
        aria-label="Attach files"
        className={className}
        onClick={() => fileRef.current?.click()}
      >
        {icon}
      </ChatInputButton>
    </>
  );
}

/** Send, or stop while the agent is replying. Holding send fires `onSendHold`. */
export function ChatInputSubmit({
  onStop,
  working = false,
  sendIcon = defaultSendIcon,
  canSend,
  disabled,
  className,
  onSendHold,
  sendHoldMs = 450,
  ...props
}: ChatInputSubmitProps) {
  const showStop = working && onStop !== undefined;
  const sendDisabled = disabled === true || (canSend === false && onSendHold === undefined);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const releaseHold = () => {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  useEffect(() => releaseHold, []);

  if (showStop) {
    return (
      <button
        {...props}
        type="button"
        data-slot="chat-input-submit"
        onClick={onStop}
        aria-label={props["aria-label"] ?? "Stop generating"}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-md bg-muted text-foreground transition-colors hover:bg-secondary",
          className,
        )}
      >
        <Square className="size-3.5 fill-current" aria-hidden />
      </button>
    );
  }

  return (
    <button
      {...props}
      type="submit"
      data-slot="chat-input-submit"
      disabled={sendDisabled}
      aria-label={props["aria-label"] ?? "Send message"}
      {...(onSendHold === undefined
        ? {}
        : {
            onPointerDown: () => {
              releaseHold();
              holdTimer.current = setTimeout(() => {
                holdTimer.current = null;
                onSendHold();
              }, sendHoldMs);
            },
            onPointerUp: releaseHold,
            onPointerLeave: releaseHold,
            onPointerCancel: releaseHold,
          })}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary-active disabled:opacity-40",
        className,
      )}
    >
      {sendIcon}
    </button>
  );
}
