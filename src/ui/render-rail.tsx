import { ArrowDown, Pin, PinOff } from "lucide-react";

import { generativeBlockId, type GenerativeBlock } from "../lib/generative-block.js";
import { cn } from "../lib/utils.js";
import { GenerativeBlockView } from "./generative-block-view.js";

export type RenderRailProps = {
  readonly block: GenerativeBlock | null;
  readonly isPinned: boolean;
  readonly onTogglePin: () => void;
  /** True once a block newer than the pinned one has arrived. Omit (or leave false) to skip the affordance entirely. */
  readonly hasNewerBlock?: boolean;
  readonly onJumpToLatest?: () => void;
  readonly className?: string;
};

/**
 * Cross-fades between the Pin and PinOff glyphs rather than swapping them
 * in place — keyed by which icon is showing, so the swap remounts and its
 * `corbits-icon-swap` animation plays every time the pin state flips.
 */
function PinIcon({ isPinned }: { isPinned: boolean }) {
  return (
    <span key={isPinned ? "pinned" : "unpinned"} className="inline-flex [animation:corbits-icon-swap_150ms_var(--ease-out)_both]">
      {isPinned ? <Pin className="size-3.5 fill-current" aria-hidden /> : <PinOff className="size-3.5" aria-hidden />}
    </span>
  );
}

/**
 * The banner that appears over a pinned block once a newer one has arrived
 * behind it — clicking it is the one way `jumpToLatest` gets called, so the
 * reader always chooses when to leave what they pinned.
 */
function NewerResultAffordance({ onJumpToLatest }: { onJumpToLatest: () => void }) {
  return (
    <button
      type="button"
      onClick={onJumpToLatest}
      className="flex items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary-emphasis transition-colors [animation:corbits-rail-block-in_200ms_var(--ease-out)_both] hover:bg-primary/20"
    >
      <ArrowDown className="size-3" aria-hidden />
      Newer result available
    </button>
  );
}

/**
 * The dual-column rail: one active generative block, mirrored from the
 * transcript, with a pin control in its corner. Only meaningful in `fullpage`
 * mode — `fullpage` is the one mode with the width to spare for a second
 * column, so the host only mounts this rail there.
 *
 * The rail itself holds no state; `useRenderRail` decides which block is
 * "active", whether it is pinned, and whether a newer block has arrived
 * behind it. This piece just renders that decision and reports the gestures
 * the reader can make against it.
 *
 * The active block is keyed by its id, so React remounts a fresh node on
 * every swap — including from the empty state — and `corbits-rail-block-in`
 * (transform + opacity only) plays on each one.
 */
export function RenderRail({ block, isPinned, onTogglePin, hasNewerBlock = false, onJumpToLatest, className }: RenderRailProps) {
  if (block === null) {
    return (
      <aside
        aria-label="Rendered content"
        className={cn(
          "flex min-h-0 w-[22rem] shrink-0 flex-col items-center justify-center border-l border-border p-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        <span key="empty" className="[animation:corbits-rail-block-in_200ms_var(--ease-out)_both]">
          Generative content will appear here.
        </span>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Rendered content"
      className={cn("flex min-h-0 w-[22rem] shrink-0 flex-col gap-3 overflow-y-auto border-l border-border p-4", className)}
    >
      <div className="flex items-center justify-between gap-2">
        {hasNewerBlock && onJumpToLatest ? <NewerResultAffordance onJumpToLatest={onJumpToLatest} /> : <span />}
        <button
          type="button"
          onClick={onTogglePin}
          aria-pressed={isPinned}
          aria-label={isPinned ? "Unpin from rail" : "Pin to rail"}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <PinIcon isPinned={isPinned} />
        </button>
      </div>
      <div key={generativeBlockId(block)} className="[animation:corbits-rail-block-in_200ms_var(--ease-out)_both]">
        <GenerativeBlockView block={block} />
      </div>
    </aside>
  );
}
