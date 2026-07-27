import { useId } from "react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type BootScreenProps = {
  /** What the app is doing, in words: "Loading workbench", "Reconnecting…". */
  readonly message: string;
  /** Brand lockup, top left. */
  readonly brand?: ReactNode;
  /** Quiet corner detail — a version string, a build id. */
  readonly footer?: ReactNode;
  readonly className?: string;
};

/**
 * The screen before the app: brand top-left, one centered status line, a quiet
 * corner detail. Fills its positioned parent — `BootScreen` is the surface, and
 * whoever mounts it decides whether that is the whole viewport (initial load)
 * or a cover over a live app (`ReconnectingOverlay`).
 *
 * `role="status"` with the message as the accessible name, so a screen reader
 * announces the state change rather than the user waiting on a blank screen.
 * No spinner: the pulsing bar is decorative and `aria-hidden`, and it collapses
 * to a still frame under the theme's reduced-motion rule with nothing to do
 * here.
 */
export function BootScreen({ message, brand, footer, className }: BootScreenProps) {
  const messageId = useId();

  return (
    <div
      role="status"
      aria-labelledby={messageId}
      className={cn("absolute inset-0 overflow-hidden bg-background text-foreground", className)}
    >
      {brand === undefined ? null : <div className="absolute top-6 left-7">{brand}</div>}

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
        <span aria-hidden className="h-0.5 w-24 overflow-hidden rounded-full bg-muted">
          <span className="block h-full w-1/3 rounded-full bg-primary [animation:corbits-boot-sweep_1.4s_ease-in-out_infinite]" />
        </span>
        <p id={messageId} className="max-w-[32ch] text-center text-xs leading-relaxed text-muted-foreground">
          {message}
        </p>
      </div>

      {footer === undefined ? null : (
        <div className="absolute bottom-6 left-7 font-mono text-[11px] text-muted-foreground">{footer}</div>
      )}
    </div>
  );
}
