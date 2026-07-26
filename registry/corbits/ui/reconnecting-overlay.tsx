import type { ReactNode } from "react";

import { BootScreen } from "@/registry/corbits/ui/boot-screen";

export type ReconnectingOverlayProps = {
  /** The host's connection state. `false` unmounts the cover entirely. */
  readonly open: boolean;
  readonly message?: string;
  readonly brand?: ReactNode;
  readonly footer?: ReactNode;
};

/**
 * Full-viewport cover for a live app that has lost its connection. The same
 * boot screen as first load, because it is the same fact: the app is not usable
 * yet, and showing a second visual language for it only teaches the user two
 * things instead of one.
 *
 * IMPORTANT — this covers the app, it does not disable it. An element cannot
 * make its siblings inert, so the host must set `inert` on the app root while
 * `open` is true, or keyboard focus walks straight into the frozen UI behind
 * the cover:
 *
 *     <div id="app" {...(reconnecting ? { inert: true } : {})}>…</div>
 *     <ReconnectingOverlay open={reconnecting} />
 */
export function ReconnectingOverlay({
  open,
  message = "Reconnecting…",
  brand,
  footer,
}: ReconnectingOverlayProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-100 [animation:corbits-fade-in_200ms_ease-out]">
      <BootScreen message={message} brand={brand} footer={footer} />
    </div>
  );
}
