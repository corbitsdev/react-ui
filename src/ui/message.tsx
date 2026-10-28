"use client";

import { CircleAlert } from "lucide-react";
import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentProps, ReactElement, ReactNode } from "react";

import type { ConversationMessageStatus } from "../lib/conversation.js";
import { formatRelativeTime } from "../lib/relative-time.js";
import { cn } from "../lib/utils.js";
import { Avatar, type AvatarProps } from "./avatar.js";
import { Button } from "./button.js";

/**
 * Who a message is from, as the viewer sees it: an `agent`, another
 * `person`, or the viewer themself (`own`).
 */
export type MessageFrom = "agent" | "person" | "own";

export type MessageContextValue = {
  readonly from: MessageFrom;
  readonly status: ConversationMessageStatus;
  readonly error: string | undefined;
  readonly onRetry: (() => void) | undefined;
  /** The id `MessageHeader` gives the author's name, naming the message. */
  readonly nameId: string;
  /**
   * Whether a failure the reader saw happen is being announced: the visible
   * error is then left to the announcement so it is not read twice.
   */
  readonly announcing: boolean;
  /** Called on mount by a placed `MessageSendStatus`; returns its unregister. */
  readonly registerSendStatus: () => () => void;
  /** Called on mount by a `MessageHeader`; returns its unregister. */
  readonly registerHeader: () => () => void;
};

const MessageContext = createContext<MessageContextValue | null>(null);

/**
 * The enclosing `Message`'s props, or `null` outside one: for parts a host
 * builds itself, and for parts that can stand alone (`MessageFold`) to read
 * as defaults.
 */
export function useMessageContext(): MessageContextValue | null {
  return useContext(MessageContext);
}

function useMessage(part: string): MessageContextValue {
  const context = useContext(MessageContext);
  if (context === null) throw new Error(`${part} must be inside a Message.`);
  return context;
}

export type MessageProps = ComponentProps<"article"> & {
  readonly from: MessageFrom;
  /** Defaults to `sent`. */
  readonly status?: ConversationMessageStatus;
  /** Why a `failed` message failed, shown by its send status. */
  readonly error?: string | undefined;
  /** Offered as a Retry control by its send status on a `failed` message. */
  readonly onRetry?: (() => void) | undefined;
};

/** The parts as laid out in the grid: children with fragments opened. */
function partsOf(children: ReactNode): ReactElement[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    if (child.type === Fragment) {
      return partsOf((child.props as { children?: ReactNode }).children);
    }
    return [child];
  });
}

const shownStatus = (status: ConversationMessageStatus) =>
  status === "sending" || status === "failed";

const reasonOf = (error: string | undefined) => error ?? "Not sent.";

/** A ref-counted flag a part sets for as long as it is mounted. */
function useRegistry(): readonly [boolean, () => () => void] {
  const [count, setCount] = useState(0);
  const register = useCallback(() => {
    setCount((value) => value + 1);
    return () => setCount((value) => value - 1);
  }, []);
  return [count > 0, register] as const;
}

/**
 * One message, built from parts: `MessageAvatar`, `MessageHeader`,
 * `MessageContent`, `MessageSendStatus`, `MessageFooter`, and anything else the
 * host puts in. Every part is optional. Parts stack in order; a
 * `MessageAvatar` takes a column of its own beside them, at the start, or at
 * the end for the viewer's own messages.
 *
 * Only the viewer's own messages sit in a bubble, at the end of the line. An
 * agent's or person's message is set on the page with no container, so a long
 * answer reads as text.
 *
 * A `sending` or `failed` message always shows its send status: Message
 * adds the line after the other parts unless a `MessageSendStatus` is placed
 * anywhere inside it, which then sets where it goes.
 *
 * A failure the reader sees happen (the message was shown sending or sent
 * first) is announced once, politely: it does not cut off what they are
 * hearing, and the Retry is right there. The error is announced as it
 * stands, so one that arrives later replaces "Not sent.". A message that
 * mounts already failed (history) is not announced, and neither is one inside
 * a `role="log"` (`ConversationContent`), which reads the new line itself.
 *
 * The message is named by its `MessageHeader`'s author name when a header is
 * anywhere inside it and the host passes no `aria-label` or
 * `aria-labelledby` of its own. Leaving out `MessageHeader` leaves out the
 * name: pass an `aria-label` (author and time, say, or "You") so a screen
 * reader still hears it.
 */
export function Message({
  from,
  status = "sent",
  error,
  onRetry,
  className,
  style,
  children,
  "aria-label": label,
  "aria-labelledby": labelledBy,
  ...props
}: MessageProps) {
  const nameId = useId();
  // Parts register from a layout effect, so a placed status line or header
  // anywhere inside is known before the first paint.
  const [placesStatus, registerSendStatus] = useRegistry();
  const [hasHeader, registerHeader] = useRegistry();
  const regionRef = useRef<HTMLSpanElement>(null);
  const [announcing, setAnnouncing] = useState(false);
  // Whether the reader has seen this message not failed since it last
  // failed: only then is a failure news to them.
  const seenUnfailed = useRef(status !== "failed");

  useEffect(() => {
    if (status !== "failed") {
      seenUnfailed.current = true;
      setAnnouncing(false);
      return;
    }
    if (!seenUnfailed.current) return;
    seenUnfailed.current = false;
    if (regionRef.current?.closest("[role='log']") != null) return;
    setAnnouncing(true);
  }, [status]);

  const context = useMemo(
    () => ({
      from,
      status,
      error,
      onRetry,
      nameId,
      announcing,
      registerSendStatus,
      registerHeader,
    }),
    [
      from,
      status,
      error,
      onRetry,
      nameId,
      announcing,
      registerSendStatus,
      registerHeader,
    ],
  );
  const parts = partsOf(children);
  const addsStatus = !placesStatus && shownStatus(status);
  // The avatar spans every row, so the rows must be declared: an implicit
  // row is outside a `1 / -1` span. Only parts that take a row count; an
  // empty row would still get the row gap. Parts beyond the count (from a
  // nested component) still stack in the column; the avatar stops short.
  const rows =
    parts.filter(
      (part) =>
        part.type !== MessageAvatar &&
        (part.type !== MessageSendStatus || shownStatus(status)),
    ).length + (addsStatus ? 1 : 0);
  return (
    <MessageContext.Provider value={context}>
      <article
        data-slot="message"
        data-from={from}
        data-status={status}
        aria-label={label}
        aria-labelledby={
          labelledBy ?? (label === undefined && hasHeader ? nameId : undefined)
        }
        className={cn(
          "grid min-w-0 grid-cols-[minmax(0,1fr)] gap-x-3 gap-y-1.5",
          from === "own"
            ? "justify-items-end has-[>[data-slot=message-avatar]]:grid-cols-[minmax(0,1fr)_auto] has-[>[data-slot=message-avatar]]:*:col-start-1"
            : "has-[>[data-slot=message-avatar]]:grid-cols-[auto_minmax(0,1fr)] has-[>[data-slot=message-avatar]]:*:col-start-2",
          className,
        )}
        style={{
          gridTemplateRows: `repeat(${Math.max(rows, 1)}, auto)`,
          ...style,
        }}
        {...props}
      >
        {children}
        {addsStatus ? <SendStatusLine /> : null}
        {status === "sent" && !announcing ? null : (
          <span ref={regionRef} role="status" className="sr-only">
            {announcing ? reasonOf(error) : ""}
          </span>
        )}
      </article>
    </MessageContext.Provider>
  );
}

export type MessageSendStatusProps = ComponentProps<"div">;

/**
 * Where a send stands: "Sending…" while `sending`; the error and a Retry
 * control (when the message has `onRetry`) once `failed`. Nothing otherwise.
 * `Message` adds the line itself; place this anywhere inside it (in a
 * `MessageFooter`, say) to choose where it goes instead.
 */
export function MessageSendStatus(props: MessageSendStatusProps) {
  const { registerSendStatus } = useMessage("MessageSendStatus");
  useLayoutEffect(registerSendStatus, [registerSendStatus]);
  return <SendStatusLine {...props} />;
}

function SendStatusLine({ className, ...props }: MessageSendStatusProps) {
  const { status, error, onRetry, announcing } =
    useMessage("MessageSendStatus");
  if (!shownStatus(status)) return null;
  return (
    <div
      data-slot="message-send-status"
      data-status={status}
      className={cn(
        "flex flex-wrap items-center gap-x-2 text-xs",
        status === "failed" ? "text-destructive" : "text-muted-foreground",
        className,
      )}
      {...props}
    >
      {status === "sending" ? (
        "Sending…"
      ) : (
        <>
          {/* While announced, Message's status region holds this exact
              text: hidden here so it is not read twice. */}
          <span
            aria-hidden={announcing ? true : undefined}
            className="flex items-center gap-1"
          >
            <CircleAlert aria-hidden className="size-3.5 shrink-0" />
            {reasonOf(error)}
          </span>
          {onRetry === undefined ? null : (
            <Button
              variant="link"
              size="sm"
              className="text-xs"
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export type MessageAvatarProps = Omit<AvatarProps, "initials" | "label"> & {
  /** The author's name: the avatar's accessible label. */
  readonly name: string;
  /** Up to two characters. Defaults to the first letters of `name`. */
  readonly initials?: string;
};

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("");
}

/**
 * The author's avatar, in a column of its own beside the message. An agent's takes the agent
 * tone by default; a person's stays neutral.
 */
export function MessageAvatar({
  name,
  initials,
  tone,
  shape = "circle",
  className,
  ...props
}: MessageAvatarProps) {
  const { from } = useMessage("MessageAvatar");
  return (
    <span
      data-slot="message-avatar"
      className={cn(
        "row-span-full inline-flex self-start",
        from === "own" ? "col-start-2!" : "col-start-1!",
      )}
    >
      <Avatar
        initials={initials ?? initialsOf(name)}
        label={name}
        tone={tone ?? (from === "agent" ? "agent" : "neutral")}
        shape={shape}
        {...props}
        {...(className === undefined ? {} : { className })}
      />
    </span>
  );
}

export type MessageHeaderProps = Omit<ComponentProps<"header">, "role"> & {
  readonly name: ReactNode;
  /** One quiet line beside the name, e.g. an agent's role. */
  readonly role?: ReactNode;
  /** ISO timestamp of the message. */
  readonly at?: string | undefined;
  /** Reference time for the relative label, in ms. Defaults to now. */
  readonly now?: number | undefined;
  /** Formats `at`. Defaults to a relative time ("5 min ago"). */
  readonly formatTime?: ((at: string) => string) | undefined;
};

/** The author's name, an optional role and when the message was sent. */
export function MessageHeader({
  name,
  role,
  at,
  now,
  formatTime,
  className,
  children,
  ...props
}: MessageHeaderProps) {
  const message = useMessageContext();
  const register = message?.registerHeader;
  useLayoutEffect(() => register?.(), [register]);
  return (
    <header
      data-slot="message-header"
      className={cn(
        "flex min-w-0 flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      <span
        id={message?.nameId}
        className="text-sm font-semibold text-foreground"
      >
        {name}
      </span>
      {role === undefined ? null : <span>{role}</span>}
      {at === undefined ? null : (
        <time dateTime={at} title={at}>
          {formatTime === undefined
            ? formatRelativeTime(at, now)
            : formatTime(at)}
        </time>
      )}
      {children}
    </header>
  );
}

export type MessageContentProps = ComponentProps<"div"> & {
  /** The message's text. Without `render` it is shown as plain text. */
  readonly text?: string | undefined;
  /**
   * Renders `text`, e.g. as markdown with the host's own renderer and
   * sanitiser. This package renders no markdown itself.
   */
  readonly render?: ((text: string) => ReactNode) | undefined;
};

/**
 * The message body: `text` (through `render` when given) or, without `text`,
 * the children. The viewer's own message is a bubble; anyone else's is plain
 * text on the page. Busy while the message streams.
 */
export function MessageContent({
  text,
  render,
  className,
  children,
  ...props
}: MessageContentProps) {
  const { from, status } = useMessage("MessageContent");
  const plain = text !== undefined && render === undefined;
  return (
    <div
      data-slot="message-content"
      aria-busy={status === "streaming" ? true : undefined}
      className={cn(
        "min-w-0 text-sm leading-relaxed break-words text-foreground",
        plain && "whitespace-pre-wrap",
        from === "own" && "max-w-prose rounded-lg bg-muted px-3 py-2",
        className,
      )}
      {...props}
    >
      {text === undefined
        ? children
        : render === undefined
          ? text
          : render(text)}
    </div>
  );
}

export type MessageFooterProps = ComponentProps<"div">;

/** One line under the message: reactions, replies, actions. */
export function MessageFooter({ className, ...props }: MessageFooterProps) {
  const { from } = useMessage("MessageFooter");
  return (
    <div
      data-slot="message-footer"
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2",
        from === "own" && "justify-end",
        className,
      )}
      {...props}
    />
  );
}
