import { Maximize2, MessageCircle, Minimize2, X } from "lucide-react";

import { cn } from "../../lib/utils.js";
import { Badge } from "../../ui/badge.js";
import { Button } from "../../ui/button.js";

/**
 * Extends an icon button's hit area to the 40px floor without inflating its
 * visual size — `size="icon"` renders at 36px (`size-9`). Same `::after`
 * technique as `ReasoningPartView` in `parts-renderer.tsx`, just applied to
 * all four sides of a square button instead of the height of a full-width
 * row: 2px of inset on every edge closes the 4px gap.
 */
const ICON_HIT_AREA = "relative after:absolute after:-inset-0.5 after:content-['']";

/**
 * The canvas column's header: title, a neutral "kind" badge, focus-toggle,
 * close. No orange here — `bg-primary` is reserved for the one deliberate
 * call-to-action a surface has, and a chrome row that's on screen for the
 * entire time the canvas is open is not that; both icon buttons stay
 * `ghost` even while focused.
 */
export function CanvasHostHeader({
  title,
  kind,
  focus,
  onFocusChange,
  onClose,
  className,
}: {
  readonly title: string;
  readonly kind: string;
  readonly focus: boolean;
  readonly onFocusChange: (focus: boolean) => void;
  readonly onClose: () => void;
  readonly className?: string;
}) {
  return (
    <header
      data-slot="canvas-host-header"
      className={cn("flex shrink-0 items-center gap-2 border-b border-border px-4 py-3", className)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <p className="truncate text-sm font-semibold">{title}</p>
        <Badge tone="neutral">{kind}</Badge>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onFocusChange(!focus)}
          aria-label={focus ? "Exit focus" : "Focus canvas"}
          className={ICON_HIT_AREA}
        >
          {focus ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close canvas"
          className={ICON_HIT_AREA}
        >
          <X aria-hidden />
        </Button>
      </div>
    </header>
  );
}

/**
 * A decorative stand-in for the chat column once focus mode has collapsed it
 * past usability. `aria-hidden`: it conveys nothing a screen reader needs —
 * the real chat content underneath is `invisible` rather than removed (see
 * `canvas-host.tsx`'s layout-mode comment), and the way back is the
 * focus-toggle button in `CanvasHostHeader` above, not this rail.
 */
export function ChatRailIndicator({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      data-slot="canvas-host-chat-rail"
      className={cn("hidden h-full w-full flex-col items-center gap-2 pt-4 text-muted-foreground lg:flex", className)}
    >
      <MessageCircle className="size-4" />
    </div>
  );
}
