"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import type * as React from "react";

import { cn } from "@/registry/corbits/lib/utils";

export type FileInputProps = Omit<React.ComponentProps<"input">, "type" | "onChange" | "className"> & {
  readonly onFiles: (files: FileList) => void;
  readonly label?: string;
  readonly hint?: string;
  readonly className?: string;
};

/**
 * A drop zone that is also a button that is also a real file input.
 *
 * The `<input type="file">` is the control — visually hidden with `sr-only`,
 * never `display: none`, because a hidden-by-display input is unreachable by
 * keyboard and invisible to assistive tech. The `<label>` wrapping it is what
 * the user sees and clicks, which is also what makes the whole zone activate
 * the picker with no click handler at all.
 *
 * Drag-and-drop is added on top rather than replacing that. A drop-only zone
 * excludes anyone not using a mouse, and every real upload control needs the
 * picker anyway.
 *
 * The input is cleared after each selection so choosing the same file twice
 * still fires — the browser's change event will not repeat for an identical
 * value.
 */
export function FileInput({ onFiles, label = "Choose files", hint, className, disabled, ...props }: FileInputProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <label
      onDragOver={(event) => {
        if (disabled === true) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        if (disabled === true) return;
        event.preventDefault();
        setDragging(false);
        if (event.dataTransfer.files.length > 0) onFiles(event.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-input px-6 py-8 text-center transition-colors",
        dragging && "border-primary-emphasis bg-primary/10",
        disabled === true ? "cursor-not-allowed opacity-50" : "hover:bg-muted",
        // The focus ring lives on the hidden input; project it onto the zone,
        // which is the thing the user can actually see.
        "has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--ring)]",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          if (event.target.files !== null && event.target.files.length > 0) onFiles(event.target.files);
          event.target.value = "";
        }}
        {...props}
      />
      <Upload className="size-5 text-muted-foreground" aria-hidden />
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{hint ?? "or drag them here"}</span>
    </label>
  );
}
