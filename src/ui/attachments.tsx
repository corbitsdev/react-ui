"use client";

import {
  File as FileIcon,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Play,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type * as React from "react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import { mediaKindOf, type MediaKind } from "../lib/media-kind.js";
import { cn } from "../lib/utils.js";

/**
 * A file as `Attachment` shows it. An `AttachmentItem` from
 * `useAttachments` fits, and so does a message's `PartFile`.
 */
export type AttachmentData = {
  readonly name: string;
  readonly mediaType: string;
  /** In bytes; left out when not known. */
  readonly size?: number;
  /** Where to show or open it from. */
  readonly url?: string;
  /**
   * The local file, when there is one. A picture whose `url` no longer
   * loads, such as a preview `useAttachments` revoked while it was hidden,
   * is rebuilt from it.
   */
  readonly file?: File;
};

/**
 * `stack`: a deck of cards above the message box that fans out when pointed
 * at or tabbed into. `tiles`: thumbnails in a message. `list`: one row each.
 */
export type AttachmentsVariant = "stack" | "tiles" | "list";

type AttachmentsContextValue = {
  readonly variant: AttachmentsVariant;
  readonly expanded: boolean;
  readonly setExpanded: (expanded: boolean) => void;
  /** Where focus goes when the attachment holding it is removed. */
  readonly focusAfterRemove: React.RefObject<HTMLElement | null>;
  /** Where focus goes when no other attachment is left to take it. */
  readonly returnFocusTo: React.RefObject<HTMLElement | null> | undefined;
  /** Which item takes focus once `AttachmentMore`, holding it, expands the list. */
  readonly focusAfterExpand: React.RefObject<number | null>;
};

const AttachmentsContext = createContext<AttachmentsContextValue | null>(null);

function useAttachmentsContext(part: string): AttachmentsContextValue {
  const context = useContext(AttachmentsContext);
  if (context === null) throw new Error(`${part} must be inside Attachments.`);
  return context;
}

type AttachmentContextValue = {
  readonly data: AttachmentData;
  readonly kind: MediaKind;
  /** Whether the preview shows the file itself rather than its type. */
  readonly pictured: boolean;
  /** Where the picture loads from: `data.url`, or one rebuilt from the file. */
  readonly src: string | undefined;
  /** The picture failed to load. */
  readonly setBroken: () => void;
};

const AttachmentContext = createContext<AttachmentContextValue | null>(null);

function useAttachmentContext(part: string): AttachmentContextValue {
  const context = useContext(AttachmentContext);
  if (context === null)
    throw new Error(`${part} must be inside an Attachment.`);
  return context;
}

/** "18 KB", "2.4 MB". */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

/** "PDF", "CSV": the type, for a file with no picture to show. */
function extensionOf(name: string): string {
  const base = name.slice(name.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot <= 0 ? "FILE" : base.slice(dot + 1, dot + 5).toUpperCase();
}

/** "report.pdf, 2.4 MB": how a control names the file. */
function describe(data: AttachmentData): string {
  return data.size === undefined
    ? data.name
    : `${data.name}, ${formatBytes(data.size)}`;
}

function KindIcon({
  kind,
  className,
}: {
  readonly kind: MediaKind;
  readonly className?: string;
}) {
  const Icon =
    kind === "image"
      ? FileImage
      : kind === "video"
        ? FileVideo
        : kind === "audio"
          ? FileAudio
          : kind === "pdf" || kind === "text"
            ? FileText
            : FileIcon;
  return <Icon aria-hidden className={className} />;
}

// The deck is laid out from the list, so a card never has to know where it
// sits: overlapped and tilted at rest, fanned out and upright while the list
// is pointed at or holds focus. The list is the hover target, not the cards,
// so a card lifting away from the pointer does not drop the hover.
const STACK_DECK = [
  "relative flex w-fit items-end pt-1",
  "[&>li+li]:ms-2 motion-safe:[&>li]:transition-[margin,translate,rotate,opacity] motion-safe:[&>li]:duration-200 motion-safe:[&>li]:ease-out",
  "pointer-fine:[&:not(:hover,:focus-within)>li+li]:-ms-10.5",
  "pointer-fine:[&:not(:hover,:focus-within)>li:nth-child(odd)]:-rotate-3",
  "pointer-fine:[&:not(:hover,:focus-within)>li:nth-child(even)]:rotate-3",
  "pointer-fine:[&:is(:hover,:focus-within)>li]:-translate-y-3.5",
  // The count, on the top card's corner, until the deck fans out.
  "after:pointer-events-none after:absolute after:-top-1 after:-end-1.5 after:grid after:h-5 after:min-w-5 after:place-items-center after:rounded-full after:bg-primary after:px-1 after:text-xs after:font-semibold after:text-primary-foreground after:ring-2 after:ring-background after:content-[attr(data-total)_/_''] after:motion-safe:transition-opacity",
  "pointer-coarse:after:hidden [&:is(:hover,:focus-within)]:after:opacity-0 [&:not([data-total])]:after:hidden",
].join(" ");

const ROOT: Record<AttachmentsVariant, string> = {
  stack: STACK_DECK,
  tiles: "flex flex-wrap gap-2",
  list: "flex flex-col gap-1.5",
};

export type AttachmentsState = { readonly expanded: boolean };

export type AttachmentsProps = Omit<React.ComponentProps<"ul">, "children"> & {
  readonly variant?: AttachmentsVariant;
  /**
   * Whether every attachment is shown. The host decides what folds away
   * while this is false (say, all but the first five) and renders an
   * `AttachmentMore` for the rest, which sets it to true. A stack that is
   * expanded lays its cards out in rows, upright, each with its name.
   */
  readonly expanded?: boolean | undefined;
  readonly defaultExpanded?: boolean;
  readonly onExpandedChange?: ((expanded: boolean) => void) | undefined;
  /**
   * How many attachments there are, folded ones included: the stack shows
   * it on its top card, and it names the list ("3 attachments").
   */
  readonly total?: number;
  /**
   * Where focus goes when the attachment holding it is removed and no other
   * is left to take it: the message box, or the file picker. Without it,
   * focus goes to the list, and is lost if the host stops rendering the list
   * once it is empty.
   */
  readonly returnFocusTo?: React.RefObject<HTMLElement | null>;
  /**
   * The `Attachment`s, and an `AttachmentMore` when some are folded away.
   * A function gets the current `expanded`, for a host that leaves it
   * uncontrolled.
   */
  readonly children?:
    | React.ReactNode
    | ((state: AttachmentsState) => React.ReactNode);
};

/**
 * Files shown three ways: a `stack` above the message box, `tiles` in a
 * message, or a `list`. The host renders an `Attachment` for each file and
 * owns the list itself; this only lays them out.
 *
 * When an attachment holding focus is removed, focus moves to the next
 * attachment's remove button, or the previous one's, or `returnFocusTo`, or
 * the list. Controls of the host's own that go away as they are used ("Show
 * less", "Remove all") move focus themselves.
 */
export function Attachments({
  variant = "tiles",
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  total,
  returnFocusTo,
  className,
  ref,
  children,
  ...props
}: AttachmentsProps) {
  const [expanded, setExpanded] = useControllableState({
    value: expandedProp,
    defaultValue: defaultExpanded,
    onChange: onExpandedChange,
    name: "Attachments",
  });
  const focusAfterRemove = useRef<HTMLElement | null>(null);
  const focusAfterExpand = useRef<number | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const setList = useCallback(
    (element: HTMLUListElement | null) => {
      listRef.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref !== null && ref !== undefined) ref.current = element;
    },
    [ref],
  );

  // "+N" goes away as the list expands; focus moves to the first attachment
  // it was folding, not back to the start of the page.
  useLayoutEffect(() => {
    const index = focusAfterExpand.current;
    const list = listRef.current;
    if (!expanded || index === null || list === null) return;
    focusAfterExpand.current = null;
    const revealed = list.children.item(index);
    const control =
      revealed?.querySelector<HTMLElement>("button, [tabindex='0']") ?? list;
    control.focus();
  }, [expanded]);

  return (
    <AttachmentsContext.Provider
      value={{
        variant,
        expanded,
        setExpanded,
        focusAfterRemove,
        focusAfterExpand,
        returnFocusTo,
      }}
    >
      <ul
        ref={setList}
        data-slot="attachments"
        data-variant={variant}
        data-expanded={expanded ? "true" : undefined}
        data-total={
          variant === "stack" && total !== undefined && total > 1
            ? total
            : undefined
        }
        aria-label={
          total === undefined
            ? "Attachments"
            : `${total} ${total === 1 ? "attachment" : "attachments"}`
        }
        tabIndex={-1}
        className={cn(
          variant === "stack" && expanded
            ? "flex flex-wrap items-start gap-2"
            : ROOT[variant],
          className,
        )}
        {...props}
      >
        {typeof children === "function" ? children({ expanded }) : children}
      </ul>
    </AttachmentsContext.Provider>
  );
}

function itemClasses(variant: AttachmentsVariant, expanded: boolean): string {
  const card =
    "group/attachment relative shrink-0 rounded-lg bg-card text-card-foreground ring-1 ring-border";
  switch (variant) {
    case "stack":
      return cn(
        card,
        "shadow-surface",
        expanded ? "flex w-19 flex-col items-center gap-1 pb-1.5" : "size-13",
      );
    case "tiles":
      return cn(
        card,
        "flex size-30 flex-col gap-1 p-2.5 has-[button[data-slot=attachment-preview]:hover]:ring-border-strong",
        "data-[pictured=true]:w-auto data-[pictured=true]:max-w-60 data-[pictured=true]:min-w-20 data-[pictured=true]:p-0",
      );
    case "list":
      return cn(card, "flex min-w-0 items-center gap-3 p-2");
  }
}

export type AttachmentProps = React.ComponentProps<"li"> & {
  readonly data: AttachmentData;
};

/**
 * Where a picture loads from: `url`, or, once that fails to load and the
 * file is at hand, a URL made from the file. A URL made here is revoked
 * when the attachment unmounts or is hidden, and made again when it shows.
 * A rebuilt URL that fails too leaves no picture.
 */
function usePictureSource(
  url: string | undefined,
  file: File | undefined,
): { readonly src: string | undefined; readonly setBroken: () => void } {
  const [failed, setFailed] = useState<{
    readonly url: string | undefined;
    readonly rebuilt: boolean;
  } | null>(null);
  const failedHere = failed !== null && failed.url === url;
  const source =
    failedHere && !failed.rebuilt && file !== undefined ? file : undefined;
  const [rebuilt, setRebuilt] = useState<{
    readonly file: File;
    readonly url: string;
  } | null>(null);

  // Before paint, so the picture never flashes its type on the way.
  useLayoutEffect(() => {
    if (source === undefined) return;
    const made = URL.createObjectURL(source);
    setRebuilt({ file: source, url: made });
    return () => URL.revokeObjectURL(made);
  }, [source]);

  const src = !failedHere
    ? url
    : source !== undefined && rebuilt?.file === source
      ? rebuilt.url
      : undefined;
  const setBroken = useCallback(
    () => setFailed({ url, rebuilt: failedHere }),
    [url, failedHere],
  );
  return { src, setBroken };
}

/** One file in `Attachments`; its parts read the file from here. */
export function Attachment({
  data,
  className,
  ref,
  children,
  ...props
}: AttachmentProps) {
  const { variant, expanded, focusAfterRemove } =
    useAttachmentsContext("Attachment");
  const kind = mediaKindOf(data.name, data.mediaType);
  const { src, setBroken } = usePictureSource(data.url, data.file);
  const pictured = (kind === "image" || kind === "video") && src !== undefined;
  const elementRef = useRef<HTMLLIElement | null>(null);

  const setElement = useCallback(
    (element: HTMLLIElement | null) => {
      elementRef.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref !== null && ref !== undefined) ref.current = element;
    },
    [ref],
  );

  // A layout cleanup runs while the item is still attached, so `contains`
  // still sees focus inside it.
  useLayoutEffect(() => {
    const element = elementRef.current;
    return () => {
      const target = focusAfterRemove.current;
      if (
        element === null ||
        target === null ||
        !element.contains(document.activeElement)
      ) {
        return;
      }
      focusAfterRemove.current = null;
      if (target.isConnected) target.focus();
    };
  }, [focusAfterRemove]);

  return (
    <AttachmentContext.Provider
      value={{ data, kind, pictured, src, setBroken }}
    >
      <li
        ref={setElement}
        data-slot="attachment"
        data-kind={kind}
        data-pictured={pictured ? "true" : undefined}
        className={cn(itemClasses(variant, expanded), className)}
        {...props}
      >
        {children}
      </li>
    </AttachmentContext.Provider>
  );
}

function previewClasses(
  variant: AttachmentsVariant,
  expanded: boolean,
  pictured: boolean,
): string {
  switch (variant) {
    case "stack":
      return cn(
        "grid w-full place-items-center overflow-hidden",
        expanded ? "h-13 rounded-t-lg" : "h-full rounded-lg",
      );
    case "tiles":
      // A tile without a picture is all preview too, so the whole tile
      // opens it; the name and size show through from beneath.
      return pictured
        ? "grid h-full place-items-center overflow-hidden rounded-lg"
        : "absolute inset-0 flex items-start rounded-lg p-2.5";
    case "list":
      return "grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-muted";
  }
}

export type AttachmentPreviewProps = Omit<
  React.HTMLAttributes<HTMLElement>,
  "children" | "onClick"
> & {
  /** A `<span>`, or a `<button>` with `onOpen`. */
  readonly ref?: React.Ref<HTMLElement>;
  /**
   * Makes the preview a button that hands the file over, for a viewer to
   * open it. Without it the preview is decorative.
   */
  readonly onOpen?: ((data: AttachmentData) => void) | undefined;
  /** The accessible name with `onOpen`; defaults to "Open" and the file. */
  readonly label?: string;
};

/**
 * The file at a glance: the picture, a video's first frame, or for anything
 * else its type. A picture that fails to load is rebuilt from `data.file`
 * when there is one, and otherwise falls back to the type.
 *
 * Host props reach the element either way; its own role, name and click
 * stay its own. Name it with `label`.
 */
export function AttachmentPreview({
  onOpen,
  label,
  className,
  ref,
  ...props
}: AttachmentPreviewProps) {
  const { variant, expanded } = useAttachmentsContext("AttachmentPreview");
  const {
    data,
    kind,
    pictured,
    src: url,
    setBroken,
  } = useAttachmentContext("AttachmentPreview");
  const setElement = useCallback(
    (element: HTMLElement | null) => {
      if (typeof ref === "function") ref(element);
      else if (ref !== null && ref !== undefined) ref.current = element;
    },
    [ref],
  );
  let face: React.ReactNode;
  if (pictured && kind === "image" && url !== undefined) {
    face = (
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        onError={setBroken}
        className={cn(
          "h-full bg-muted object-cover",
          // A screenshot keeps its heading in view in a tile.
          variant === "tiles" ? "w-auto max-w-60 object-left-top" : "w-full",
        )}
      />
    );
  } else if (pictured && kind === "video" && url !== undefined) {
    face = (
      <>
        <video
          // Without a start time, some browsers paint no frame for metadata.
          src={url.includes("#") ? url : `${url}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          onError={setBroken}
          className={cn(
            "h-full bg-muted object-cover",
            variant === "tiles" ? "w-auto max-w-60" : "w-full",
          )}
        />
        <span
          aria-hidden
          className="absolute inset-0 m-auto grid size-6 place-items-center rounded-full bg-foreground/70 text-background"
        >
          <Play className="size-3" />
        </span>
      </>
    );
  } else if (variant === "tiles") {
    face = (
      <span className="inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs font-semibold tracking-wide text-muted-foreground">
        <KindIcon kind={kind} className="size-3" />
        {extensionOf(data.name)}
      </span>
    );
  } else {
    face = (
      <span className="flex flex-col items-center gap-0.5 text-muted-foreground">
        <KindIcon kind={kind} className="size-4" />
        {variant === "stack" ? (
          <span className="text-xs leading-none font-semibold tracking-wide">
            {extensionOf(data.name)}
          </span>
        ) : null}
      </span>
    );
  }

  const shared = cn(
    "relative",
    previewClasses(variant, expanded, pictured),
    className,
  );

  if (onOpen === undefined) {
    return (
      <span
        {...props}
        ref={setElement}
        data-slot="attachment-preview"
        aria-hidden
        className={shared}
      >
        {face}
      </span>
    );
  }
  return (
    <button
      {...props}
      ref={setElement}
      type="button"
      data-slot="attachment-preview"
      aria-label={label ?? `Open ${describe(data)}`}
      className={cn(shared, "cursor-pointer", pictured && "cursor-zoom-in")}
      onClick={() => onOpen(data)}
    >
      {face}
    </button>
  );
}

function infoClasses(
  variant: AttachmentsVariant,
  expanded: boolean,
  pictured: boolean,
): string {
  switch (variant) {
    case "stack":
      return expanded
        ? "flex w-full flex-col items-center px-1.5 text-center"
        : cn(
            "pointer-events-none absolute start-0 bottom-full z-10 mb-2 flex w-max max-w-60 gap-2 rounded-md bg-popover px-2 py-1 text-popover-foreground shadow-surface ring-1 ring-border",
            "opacity-0 group-hover/attachment:opacity-100 group-focus-within/attachment:opacity-100 motion-safe:transition-opacity",
          );
    case "tiles":
      return pictured ? "sr-only" : "mt-auto flex min-w-0 flex-col gap-0.5";
    case "list":
      return "flex min-w-0 flex-1 flex-col";
  }
}

export type AttachmentInfoProps = Omit<
  React.ComponentProps<"span">,
  "children"
>;

/** The file's name and size. */
export function AttachmentInfo({ className, ...props }: AttachmentInfoProps) {
  const { variant, expanded } = useAttachmentsContext("AttachmentInfo");
  const { data, pictured } = useAttachmentContext("AttachmentInfo");
  const stacked = variant === "stack";
  return (
    <span
      data-slot="attachment-info"
      className={cn(infoClasses(variant, expanded, pictured), className)}
      {...props}
    >
      <span
        data-slot="attachment-name"
        className={cn(
          "min-w-0 font-medium [overflow-wrap:anywhere]",
          variant === "list" && "truncate text-sm",
          variant === "tiles" && "line-clamp-3 text-sm leading-snug",
          stacked && (expanded ? "line-clamp-2 text-xs" : "truncate text-xs"),
        )}
      >
        {data.name}
      </span>
      {data.size === undefined || (stacked && expanded) ? null : (
        <span
          data-slot="attachment-size"
          className="shrink-0 text-xs text-muted-foreground"
        >
          {variant === "list"
            ? `${extensionOf(data.name)} · ${formatBytes(data.size)}`
            : formatBytes(data.size)}
        </span>
      )}
    </span>
  );
}

const REMOVE: Record<AttachmentsVariant, string> = {
  stack:
    "absolute -top-1.5 -end-1.5 z-10 size-5 rounded-full bg-primary text-primary-foreground ring-2 ring-background opacity-0 group-hover/attachment:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 [&_svg]:size-3",
  tiles:
    "absolute top-1 end-1 z-10 size-6 rounded-full bg-background/90 text-foreground ring-1 ring-border opacity-0 group-hover/attachment:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 [&_svg]:size-3.5",
  list: "size-8 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-4",
};

export type AttachmentRemoveProps = Omit<
  React.ComponentProps<"button">,
  "children"
> & {
  /** The accessible name; defaults to "Remove" and the file's name. */
  readonly label?: string;
};

/**
 * Removes the file: `onClick` asks the host to take it out of its list.
 * Focus moves on to the next attachment once it is gone, or to
 * `returnFocusTo` on `Attachments` when it was the last.
 */
export function AttachmentRemove({
  label,
  className,
  onClick,
  ...props
}: AttachmentRemoveProps) {
  const { variant, focusAfterRemove, returnFocusTo } =
    useAttachmentsContext("AttachmentRemove");
  const { data } = useAttachmentContext("AttachmentRemove");
  return (
    <button
      type="button"
      data-slot="attachment-remove"
      aria-label={label ?? `Remove ${data.name}`}
      className={cn(
        "grid cursor-pointer place-items-center motion-safe:transition-[opacity,background-color,color]",
        REMOVE[variant],
        className,
      )}
      onClick={(event) => {
        const item = event.currentTarget.closest("[data-slot=attachment]");
        const list = item?.parentElement ?? null;
        const removeOf = (sibling: Element | null) =>
          sibling?.querySelector<HTMLElement>(
            "[data-slot=attachment-remove]",
          ) ?? null;
        focusAfterRemove.current =
          removeOf(item?.nextElementSibling ?? null) ??
          removeOf(item?.previousElementSibling ?? null) ??
          returnFocusTo?.current ??
          (list instanceof HTMLElement ? list : null);
        onClick?.(event);
      }}
      {...props}
    >
      <X aria-hidden />
    </button>
  );
}

const MORE: Record<AttachmentsVariant, string> = {
  stack:
    "size-13 rounded-lg bg-card text-sm font-semibold text-muted-foreground shadow-surface ring-1 ring-border hover:text-foreground pointer-fine:[ul:not([data-expanded],:hover,:focus-within)>li>&]:pointer-events-none pointer-fine:[ul:not([data-expanded],:hover,:focus-within)>li>&]:opacity-0",
  tiles:
    "size-30 rounded-lg bg-card text-base font-semibold text-muted-foreground ring-1 ring-border hover:text-foreground",
  list: "h-9 w-full rounded-md px-3 text-start text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
};

export type AttachmentMoreProps = Omit<
  React.ComponentProps<"button">,
  "children"
> & {
  /** How many attachments are folded away. */
  readonly count: number;
};

/**
 * The attachments folded away, as "+N": clicking it expands `Attachments`.
 * In a stack it shows once the deck fans out.
 *
 * Render it last, after the attachments shown: once the list expands, focus
 * moves to whichever attachment takes its place.
 */
export function AttachmentMore({
  count,
  className,
  onClick,
  ...props
}: AttachmentMoreProps) {
  const { variant, setExpanded, focusAfterExpand } =
    useAttachmentsContext("AttachmentMore");
  return (
    <li
      data-slot="attachment-more"
      className={cn(
        "flex shrink-0",
        // Out of the folded deck's flow, so the count sits on the top card.
        variant === "stack" &&
          "pointer-fine:[ul:not([data-expanded],:hover,:focus-within)>&]:absolute",
      )}
    >
      <button
        type="button"
        aria-label={`Show ${count} more`}
        className={cn(
          "cursor-pointer motion-safe:transition-[opacity,background-color,color]",
          MORE[variant],
          className,
        )}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          const item = event.currentTarget.closest("li");
          focusAfterExpand.current =
            item?.parentElement === null || item === null
              ? null
              : Array.prototype.indexOf.call(item.parentElement.children, item);
          setExpanded(true);
        }}
        {...props}
      >
        {variant === "list" ? `Show ${count} more` : `+${count}`}
      </button>
    </li>
  );
}
