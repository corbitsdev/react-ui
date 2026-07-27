import { useState } from "react";

import { cn } from "../lib/utils.js";

export type Quote = {
  readonly text: string;
  readonly author?: string;
};

export type QuoteCardProps = {
  /** Yours. This registry ships no copy — a component with opinions about what
   *  your product says is a component you have to edit before you can use it. */
  readonly quotes: readonly Quote[];
  /**
   * A key in `localStorage` for the last-shown index, so the card advances once
   * per visit instead of showing the same line forever. Omit it and the card
   * picks the first quote every time, which is the right behaviour when there
   * is only one.
   */
  readonly storageKey?: string;
  readonly className?: string;
};

/**
 * A quote, rotated once per page load.
 *
 * Once per *load*, not on a timer. Text that swaps itself while someone is
 * reading it is the pattern WCAG 2.2.2 exists to prohibit, and a marquee of
 * clever lines on a sign-in page is exactly the case it had in mind. Advancing
 * on load gives the same variety with none of that.
 *
 * The index is chosen during the initial `useState` and persisted in a mount
 * effect, so the first paint already has its quote — deriving it in an effect
 * would render quote zero and then swap it, which is the flicker this avoids.
 *
 * Every `localStorage` touch is wrapped: it throws outright in some private
 * browsing modes, and a decorative card must not be able to take down the page
 * it decorates. Losing the rotation is the correct failure — the card still
 * renders, just from the top.
 *
 * `<blockquote>` and `<cite>`, because that is what this is. The quotation and
 * its attribution are related in the markup rather than being two adjacent
 * strings that happen to sit near each other.
 */
export function QuoteCard({ quotes, storageKey, className }: QuoteCardProps) {
  const [index] = useState(() => {
    if (storageKey === undefined || quotes.length === 0) return 0;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw === null ? -1 : Number.parseInt(raw, 10);
      const last = Number.isInteger(parsed) && parsed >= 0 ? parsed : -1;
      const next = (last + 1) % quotes.length;
      window.localStorage.setItem(storageKey, String(next));
      return next;
    } catch {
      return 0;
    }
  });

  const quote = quotes[index % Math.max(quotes.length, 1)];
  if (quote === undefined) return null;

  return (
    <figure
      className={cn(
        "w-full max-w-xs rounded-xl border border-border bg-card/90 p-6 backdrop-blur-sm",
        className,
      )}
    >
      {/* `whitespace-pre-line` so a multi-line quote keeps its line breaks
          without needing markup in the string. */}
      <blockquote className="text-base leading-relaxed whitespace-pre-line text-card-foreground">
        &ldquo;{quote.text}&rdquo;
      </blockquote>
      {quote.author === undefined ? null : (
        <figcaption className="mt-4 flex items-center gap-3">
          <span aria-hidden className="h-px flex-1 bg-border" />
          <cite className="text-xs text-muted-foreground not-italic">{quote.author}</cite>
        </figcaption>
      )}
    </figure>
  );
}
