import type { ReactNode } from "react";

import { useAnchoredScroll } from "../hooks/use-anchored-scroll.js";
import { cn } from "../lib/utils.js";

export type MessageListProps = {
  /** One entry per rendered item — only the count drives the scroll anchor, see `useAnchoredScroll`. */
  readonly itemCount: number;
  readonly children?: ReactNode;
  readonly className?: string;
};

/**
 * The scrollable frame around a message transcript, anchored with
 * `useAnchoredScroll`: pinned to the bottom while the reader is there,
 * inert while they've scrolled up into history. Pure scroll mechanics — it
 * renders whatever `children` a caller gives it and owns no message model.
 */
export function MessageList({ itemCount, children, className }: MessageListProps) {
  const { containerRef, handleScroll } = useAnchoredScroll<HTMLDivElement>(itemCount);

  return (
    <div
      data-slot="message-list"
      ref={containerRef}
      onScroll={handleScroll}
      className={cn("flex flex-col gap-3 overflow-y-auto", className)}
    >
      {children}
    </div>
  );
}
