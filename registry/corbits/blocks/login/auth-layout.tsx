import type { ReactNode } from "react";

import { cn } from "@/registry/corbits/lib/utils";
import { DitherCanvas } from "@/registry/corbits/ui/dither-canvas";

export type AuthLayoutProps = {
  /** Your wordmark and product name, top-left. */
  readonly brand?: ReactNode;
  /** The form column's contents — a sign-in form, a reset form, a code prompt. */
  readonly children: ReactNode;
  /**
   * Laid over the decorative panel — usually a `QuoteCard`. Omit it and the
   * panel is just texture, which is a perfectly good outcome.
   */
  readonly aside?: ReactNode;
  readonly className?: string;
};

/**
 * The two-column sign-in shell: a form on the left, a decorative panel on the
 * right.
 *
 * The panel is hidden below `lg` rather than stacked. On a phone the form is
 * the entire task, and a full-height decorative band above it means scrolling
 * past the artwork to reach the thing you came to do.
 *
 * The form column is the semantic `<main>` and comes first in the DOM, so a
 * screen reader and a keyboard both arrive at the form immediately. The panel
 * is an `aria-hidden` sibling — it holds no information a signed-out visitor
 * needs, and the quote inside it is atmosphere.
 *
 * `min-h-svh`, not `min-h-screen`. On mobile browsers `100vh` is the viewport
 * *without* the retracting toolbar, so a `100vh` sign-in page is reliably a
 * little too tall and the button sits just under the fold.
 */
export function AuthLayout({ brand, children, aside, className }: AuthLayoutProps) {
  return (
    <div className={cn("grid min-h-svh bg-background lg:grid-cols-2", className)}>
      <main className="relative flex flex-col">
        {brand === undefined ? null : (
          <div className="flex items-center gap-2.5 p-6 text-base font-semibold tracking-tight md:p-8">{brand}</div>
        )}
        <div className="flex flex-1 items-center justify-center px-6 pb-16 md:px-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>

      <div aria-hidden className="relative hidden overflow-hidden bg-card lg:block">
        <DitherCanvas className="absolute inset-0" />
        {aside === undefined ? null : (
          <div className="absolute inset-0 flex items-center justify-center p-12">{aside}</div>
        )}
      </div>
    </div>
  );
}
