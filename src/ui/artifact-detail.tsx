import type { ReactNode } from "react";

import { type Artifact, artifactKindLabel } from "../lib/artifact.js";
import { formatRelativeTime } from "../lib/relative-time.js";
import { cn } from "../lib/utils.js";

export type ArtifactDetailProps = {
  readonly artifact: Artifact;
  /** Actions for this artifact — download, archive, share. */
  readonly actions?: ReactNode;
  /**
   * Extra facts for the metadata rail. Omit it entirely and the rail collapses:
   * an empty aside is a column of whitespace the reader keeps checking.
   */
  readonly rail?: ReactNode;
  /** The rendered artifact — usually `<ArtifactBody artifact={artifact} />`. */
  readonly children: ReactNode;
  /** Render-time for the relative timestamp. */
  readonly now?: number;
  readonly className?: string;
};

/**
 * The frame one artifact is read in: a header that names it, a wide stage, and
 * a metadata rail.
 *
 * The stage takes the width and the rail is fixed, rather than the reverse.
 * Artifact bodies are the variable part — a CSV wants every pixel, a deck wants
 * an aspect ratio, prose caps its own measure — while the metadata is a short,
 * known list. Giving the flexible thing the flexible space is the only
 * arrangement that works for all of them.
 *
 * Below `md` the rail moves under the stage instead of squeezing beside it. Two
 * columns in 360px is one unreadable body next to one unreadable rail.
 *
 * The scroll container is the stage, not the page. The header stays put, which
 * is what makes it possible to know what you are looking at halfway down a long
 * document — and it means this composes inside `PageShell`, which owns exactly
 * one page-level scroller.
 */
export function ArtifactDetail({ artifact, actions, rail, children, now, className }: ArtifactDetailProps) {
  const stamp = artifact.updatedAt ?? artifact.createdAt;

  return (
    <article className={cn("flex h-full min-h-0 w-full flex-col", className)}>
      <header className="flex shrink-0 flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{artifact.title}</h1>
          <p className="font-mono text-xs text-muted-foreground">
            {artifactKindLabel(artifact.kind)}
            {artifact.ownerName === undefined ? "" : ` · ${artifact.ownerName}`}
            {" · "}
            {/* The machine-readable date is the accessible one: "3 mo. ago" is
                unusable for anyone auditing when something was produced. */}
            <time dateTime={stamp}>{formatRelativeTime(stamp, now)}</time>
          </p>
        </div>
        {actions === undefined ? null : <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">{children}</main>
        {rail === undefined ? null : (
          <aside
            aria-label="Artifact details"
            className="shrink-0 overflow-y-auto border-t border-border px-4 py-4 md:w-72 md:border-t-0 md:border-l lg:w-80"
          >
            {rail}
          </aside>
        )}
      </div>
    </article>
  );
}
