import { Pin, PinOff } from "lucide-react";

import type { GenerativeBlock } from "../lib/generative-block.js";
import { cn } from "../lib/utils.js";
import { GenerativeBlockView } from "./generative-block-view.js";

export type RenderRailProps = {
  readonly block: GenerativeBlock | null;
  readonly isPinned: boolean;
  readonly onTogglePin: () => void;
  readonly className?: string;
};

/**
 * The dual-column rail: one active generative block, mirrored from the
 * transcript, with a pin control in its corner. Only meaningful in `fullpage`
 * mode — `fullpage` is the one mode with the width to spare for a second
 * column, so the host only mounts this rail there.
 *
 * The rail itself holds no state; `useRenderRail` decides which block is
 * "active" and whether it is pinned. This piece just renders that decision
 * and reports the one gesture the reader can make against it.
 */
export function RenderRail({ block, isPinned, onTogglePin, className }: RenderRailProps) {
  if (block === null) {
    return (
      <aside
        aria-label="Rendered content"
        className={cn(
          "flex min-h-0 w-[22rem] shrink-0 flex-col items-center justify-center border-l border-border p-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        Generative content will appear here.
      </aside>
    );
  }

  return (
    <aside
      aria-label="Rendered content"
      className={cn("flex min-h-0 w-[22rem] shrink-0 flex-col gap-3 overflow-y-auto border-l border-border p-4", className)}
    >
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onTogglePin}
          aria-pressed={isPinned}
          aria-label={isPinned ? "Unpin from rail" : "Pin to rail"}
          className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {isPinned ? <Pin className="size-3.5 fill-current" aria-hidden /> : <PinOff className="size-3.5" aria-hidden />}
        </button>
      </div>
      <GenerativeBlockView block={block} />
    </aside>
  );
}
