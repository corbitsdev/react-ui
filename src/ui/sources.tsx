import { Link } from "lucide-react";
import type * as React from "react";

import { toSafeHref } from "../lib/url.js";
import { cn } from "../lib/utils.js";

export type SourcesProps = React.ComponentProps<"ol">;

/**
 * Where an answer's facts came from: a numbered list of `Source` citations
 * that wraps across lines. Named "Sources" unless `aria-label` says otherwise.
 */
export function Sources({
  className,
  "aria-label": label = "Sources",
  ...props
}: SourcesProps) {
  return (
    // `role="list"`: WebKit drops list semantics once the bullets are removed.
    <ol
      role="list"
      aria-label={label}
      data-slot="sources"
      className={cn("m-0 flex list-none flex-wrap gap-1.5 p-0", className)}
      {...props}
    />
  );
}

export type SourceProps = Omit<React.ComponentProps<"li">, "children"> & {
  readonly href: string;
  /** The citation's title. */
  readonly children: React.ReactNode;
  /** Its number, as the answer cites it. */
  readonly index?: number;
};

/**
 * One citation, opening in a new tab. A link only for an `http:` or `https:`
 * address; anything else shows as plain text, since agent-supplied URLs are
 * untrusted.
 */
export function Source({
  href,
  index,
  className,
  children,
  ...props
}: SourceProps) {
  const safe = toSafeHref(href);
  const body = (
    <>
      {index === undefined ? null : (
        <span
          aria-hidden
          className="grid size-5 shrink-0 place-items-center rounded-full bg-background text-xs font-semibold text-foreground"
        >
          {index}
        </span>
      )}
      {safe === undefined ? null : (
        <Link aria-hidden className="size-3.5 shrink-0" />
      )}
      <span className="truncate">{children}</span>
    </>
  );
  const pill =
    "inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted py-1 ps-1 pe-2.5 text-xs text-muted-foreground";
  return (
    <li data-slot="source" className={cn("min-w-0", className)} {...props}>
      {safe === undefined ? (
        <span data-slot="source-text" className={pill}>
          {body}
        </span>
      ) : (
        <a
          href={safe}
          target="_blank"
          rel="noopener noreferrer"
          data-slot="source-link"
          className={cn(
            pill,
            "no-underline transition-colors hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {body}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </li>
  );
}
