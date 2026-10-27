"use client";

import { Paperclip } from "lucide-react";
import type * as React from "react";

import {
  useFileDrop,
  usePreventStrayDrops,
  type UseFileDropOptions,
} from "../hooks/use-file-drop.js";
import { cn } from "../lib/utils.js";

export type AttachmentDropZoneProps = Omit<
  React.ComponentProps<"div">,
  | keyof UseFileDropOptions
  | "onDragEnter"
  | "onDragOver"
  | "onDragLeave"
  | "onDrop"
> &
  UseFileDropOptions & {
    /** Shown over the zone while files are held over it. */
    readonly label?: React.ReactNode;
  };

/**
 * An area that takes dropped files and whole folders, usually the chat
 * around its input. While files are held over it, it rings itself and shows
 * `label`; the content stays visible beneath. A drop that misses it does not
 * open the file in place of the page.
 *
 * Dropping needs a pointer, so put a file picker (such as `FileInput`)
 * inside it for keyboard and touch. The zone is a plain `div`: give it
 * `role="region"` and an `aria-label` when it should be a landmark.
 */
export function AttachmentDropZone({
  onFiles,
  disabled = false,
  maxFolderEntries,
  onError,
  label = "Drop files to attach",
  className,
  children,
  ...props
}: AttachmentDropZoneProps) {
  const { over, dropProps } = useFileDrop<HTMLDivElement>({
    onFiles,
    disabled,
    ...(maxFolderEntries === undefined ? {} : { maxFolderEntries }),
    ...(onError === undefined ? {} : { onError }),
  });
  usePreventStrayDrops();

  return (
    <div
      data-slot="attachment-drop-zone"
      data-over={over ? "true" : undefined}
      className={cn("relative", className)}
      {...props}
      {...dropProps}
    >
      {children}
      {over ? (
        <div
          aria-hidden
          data-slot="attachment-drop-zone-overlay"
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-lg bg-background/80 outline-2 -outline-offset-2 outline-primary outline-dashed motion-safe:animate-[corbits-fade-in_120ms_ease-out]"
        >
          <span className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-medium text-card-foreground shadow-surface">
            <Paperclip aria-hidden className="size-4 text-primary-emphasis" />
            {label}
          </span>
        </div>
      ) : null}
    </div>
  );
}
