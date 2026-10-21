"use client";

import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useCallback, useLayoutEffect, useRef } from "react";
import type * as React from "react";

import type { MediaViewerState } from "../hooks/use-media-viewer.js";
import { mediaKindOf } from "../lib/media-kind.js";
import { safeMediaSrc } from "../lib/media-src.js";
import { cn } from "../lib/utils.js";

/** One thing the viewer can show. */
export type MediaViewerItem = {
  /** A file name: the dialog's name, and the download's. */
  readonly name: string;
  readonly mediaType: string;
  /** Where to load it from: `http:`, `https:`, `blob:`, or a `data:` image, video or audio. */
  readonly src: string;
  /** What an image shows. Defaults to `name`. */
  readonly alt?: string;
  /** A short line under the name, such as the size. */
  readonly detail?: string;
  /** A text file's contents, shown as text instead of loading `src`. */
  readonly text?: string;
};

export type MediaViewerProps = Omit<
  React.ComponentProps<"dialog">,
  "children" | "open"
> & {
  /** From `useMediaViewer`: which item is open, and how to step and close. */
  readonly viewer: MediaViewerState<MediaViewerItem>;
};

const CONTROL =
  "grid size-9 shrink-0 place-items-center rounded-full bg-popover text-popover-foreground shadow-sm transition-colors hover:bg-muted [&_svg]:size-4";

/**
 * Pictures, video, audio, PDFs and text full size, over everything, on the
 * native modal `<dialog>`: it holds focus and closes on Escape, and a click
 * outside the media closes it too. The page behind it does not scroll. With
 * more than one item, the arrow keys and the Previous and Next buttons step
 * through them, stopping at either end. Download opens a new tab where the
 * browser will not download the file. On close, focus goes back to the
 * element given to `viewer.open`, or else to whatever had it when the viewer
 * opened.
 *
 * Renders nothing while `viewer` is closed.
 */
export function MediaViewer({ viewer, ...props }: MediaViewerProps) {
  const { item, index } = viewer;
  if (item === null || index === null) return null;
  return (
    <MediaViewerDialog viewer={viewer} item={item} index={index} {...props} />
  );
}

function MediaViewerDialog({
  viewer,
  item,
  index,
  ref,
  className,
  onCancel,
  onClick,
  onKeyDown,
  ...props
}: MediaViewerProps & {
  readonly item: MediaViewerItem;
  readonly index: number;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = viewer.opener;

  const setDialog = useCallback(
    (element: HTMLDialogElement | null) => {
      dialogRef.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref !== null && ref !== undefined) ref.current = element;
    },
    [ref],
  );

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    const opener = openerRef.current ?? document.activeElement;
    if (!dialog.open) dialog.showModal();
    // showModal focuses the first control; Close is the safer start.
    closeRef.current?.focus();
    return () => {
      // No `close` listener on purpose: under StrictMode this cleanup's
      // close() queues a `close` event that would land after the re-run
      // reopens the dialog.
      if (dialog.open) dialog.close();
      if (
        opener instanceof HTMLElement &&
        opener !== document.body &&
        opener.isConnected
      ) {
        opener.focus();
      }
    };
  }, [openerRef]);

  // A modal dialog makes the page inert but leaves it scrollable; the
  // dialog's overscroll-contain stops the wheel chaining out of it, and this
  // holds the page still where that is not honoured.
  useLayoutEffect(() => {
    const root = document.scrollingElement;
    if (!(root instanceof HTMLElement)) return;
    const value = root.style.getPropertyValue("overflow");
    const priority = root.style.getPropertyPriority("overflow");
    root.style.setProperty("overflow", "hidden");
    return () => {
      if (value === "") root.style.removeProperty("overflow");
      else root.style.setProperty("overflow", value, priority);
    };
  }, []);

  const count = viewer.items.length;
  const many = count > 1;
  const position = many ? `${index + 1} of ${count}` : null;
  const download = safeMediaSrc(item.src, "media");

  return (
    <dialog
      ref={setDialog}
      aria-label={item.name}
      data-slot="media-viewer"
      className={cn(
        "fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden overscroll-contain border-0 bg-transparent p-4 text-foreground sm:px-20 sm:pt-14 sm:pb-10",
        "open:grid open:place-items-center",
        "backdrop:bg-background/90 backdrop:backdrop-blur-sm motion-safe:backdrop:animate-[corbits-fade-in_150ms_ease-out]",
        className,
      )}
      onCancel={(event) => {
        onCancel?.(event);
        event.preventDefault();
        viewer.close();
      }}
      onClick={(event) => {
        onClick?.(event);
        if (event.target === event.currentTarget) viewer.close();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        // Only from the dialog or its buttons: text scrolls and media
        // players seek with these keys.
        const target = event.target;
        const stepping =
          target === event.currentTarget ||
          target instanceof HTMLButtonElement ||
          target instanceof HTMLAnchorElement;
        if (!many || !stepping) return;
        // Next sits at the inline end, so in right-to-left it is ArrowLeft.
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
        if (event.key === (rtl ? "ArrowLeft" : "ArrowRight")) {
          event.preventDefault();
          viewer.next();
        } else if (event.key === (rtl ? "ArrowRight" : "ArrowLeft")) {
          event.preventDefault();
          viewer.previous();
        }
      }}
      {...props}
    >
      <figure
        data-slot="media-viewer-figure"
        className="m-0 grid max-h-full min-h-0 max-w-full gap-3"
      >
        <MediaViewerContent item={item} />
        <figcaption
          data-slot="media-viewer-bar"
          className="flex min-w-0 items-center gap-2"
        >
          <span className="me-auto flex min-w-0 flex-col rounded-lg bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-sm">
            <span className="truncate font-medium">{item.name}</span>
            {item.detail !== undefined || position !== null ? (
              <span className="text-xs text-muted-foreground">
                {[item.detail, position]
                  .filter((part) => part !== undefined && part !== null)
                  .join(" · ")}
              </span>
            ) : null}
          </span>
          {download === undefined ? null : (
            <a
              href={download}
              download={item.name}
              // Browsers ignore `download` across origins and open the file
              // instead; a new tab keeps the conversation in this one.
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Download ${item.name}`}
              className={CONTROL}
            >
              <Download aria-hidden />
            </a>
          )}
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            className={CONTROL}
            onClick={() => viewer.close()}
          >
            <X aria-hidden />
          </button>
        </figcaption>
      </figure>
      {many ? (
        <>
          <button
            type="button"
            aria-label="Previous"
            aria-disabled={!viewer.hasPrevious}
            data-slot="media-viewer-previous"
            className={cn(
              CONTROL,
              "absolute start-4 bottom-4 size-11 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2",
              "aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-popover",
            )}
            onClick={() => viewer.previous()}
          >
            <ChevronLeft aria-hidden className="rtl:rotate-180" />
          </button>
          <button
            type="button"
            aria-label="Next"
            aria-disabled={!viewer.hasNext}
            data-slot="media-viewer-next"
            className={cn(
              CONTROL,
              "absolute end-4 bottom-4 size-11 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2",
              "aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-popover",
            )}
            onClick={() => viewer.next()}
          >
            <ChevronRight aria-hidden className="rtl:rotate-180" />
          </button>
          {/* The dialog's name changing is not announced; this is. */}
          <p role="status" className="sr-only">
            {`${item.name}, ${position}`}
          </p>
        </>
      ) : null}
    </dialog>
  );
}

const MEDIA_FRAME =
  "max-h-[calc(100dvh-var(--spacing)*42)] max-w-[min(var(--spacing)*300,100%)] justify-self-center rounded-lg";
const PAGE_FRAME =
  "h-[calc(100dvh-var(--spacing)*42)] w-[min(var(--spacing)*225,calc(100vw-var(--spacing)*8))] rounded-lg border-0 bg-background";

function MediaViewerContent({ item }: { readonly item: MediaViewerItem }) {
  const kind = mediaKindOf(item.name, item.mediaType);
  if (kind === "text" && item.text !== undefined) {
    return (
      <pre
        key={item.name}
        tabIndex={0}
        aria-label={item.name}
        data-slot="media-viewer-text"
        className={cn(
          PAGE_FRAME,
          "m-0 overflow-auto overscroll-contain px-7 py-6 font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground",
        )}
      >
        {item.text}
      </pre>
    );
  }
  const media = safeMediaSrc(item.src, "media");
  if (kind === "image" && media !== undefined) {
    return (
      <img
        key={item.src}
        src={media}
        alt={item.alt ?? item.name}
        data-slot="media-viewer-image"
        className={cn(
          MEDIA_FRAME,
          "block object-contain motion-safe:animate-[corbits-fade-in_200ms_ease-out]",
        )}
      />
    );
  }
  if (kind === "video" && media !== undefined) {
    return (
      <video
        key={item.src}
        src={media}
        controls
        playsInline
        aria-label={item.name}
        data-slot="media-viewer-video"
        className={cn(MEDIA_FRAME, "block bg-muted")}
      />
    );
  }
  if (kind === "audio" && media !== undefined) {
    return (
      <audio
        key={item.src}
        src={media}
        controls
        aria-label={item.name}
        data-slot="media-viewer-audio"
        className="w-[min(var(--spacing)*120,calc(100vw-var(--spacing)*8))]"
      />
    );
  }
  const page = safeMediaSrc(item.src, "frame");
  if (kind === "pdf" && page !== undefined) {
    return (
      <iframe
        key={item.src}
        src={page}
        title={item.name}
        data-slot="media-viewer-page"
        className={PAGE_FRAME}
      />
    );
  }
  return (
    <p
      data-slot="media-viewer-empty"
      className="m-0 rounded-lg bg-popover px-6 py-5 text-sm text-popover-foreground"
    >
      No preview for this file.
    </p>
  );
}
