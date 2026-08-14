import { FileStack } from "lucide-react";
import type { ReactNode } from "react";

import { useCollectionState } from "../hooks/use-collection-state.js";
import { type Artifact, artifactKindLabel } from "../lib/artifact.js";
import type { CollectionRequest } from "../lib/data-port.js";
import { formatRelativeTime } from "../lib/relative-time.js";
import { toSafeHref } from "../lib/url.js";
import { cn } from "../lib/utils.js";
import { Button } from "./button.js";
import { CatalogGlyph } from "./catalog-glyph.js";
import { EmptyState } from "./empty-state.js";
import { Skeleton } from "./skeleton.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table.js";
import type { ViewMode } from "./view-toggle.js";

/**
 * One tile.
 *
 * A `<button>`, not a div wearing `role="button"`. The div version needs a
 * tabindex, an Enter handler, a Space handler that also has to `preventDefault`
 * to stop the page scrolling, and it still will not repeat on key-hold or fire
 * on Enter the way a real button does. A button is all of that for free, and the
 * `text-left`/`w-full` reset costs two classes.
 *
 * The thumbnail falls back to a generated glyph rather than to blank space, so a
 * grid of artifacts with no imagery still reads as a grid of distinct things.
 */
export function ArtifactCard({
  artifact,
  onOpen,
  now,
}: {
  readonly artifact: Artifact;
  readonly onOpen?: (artifact: Artifact) => void;
  /** Render-time for the relative timestamp. Pass one to keep output stable. */
  readonly now?: number;
}) {
  const stamp = artifact.updatedAt ?? artifact.createdAt;
  const thumbnailUrl = toSafeHref(artifact.thumbnailUrl);

  const inner = (
    <>
      <span className="relative block h-28 w-full overflow-hidden bg-muted">
        {thumbnailUrl === undefined ? (
          <CatalogGlyph seed={artifact.kind} className="h-28 rounded-none" />
        ) : (
          // Decorative: the title sits directly below in the same control, so
          // alt text here would make a screen reader read the name twice.
          //
          // A plain <img>, not `next/image`: this file is copied into whatever
          // app installs it, and half of those are not Next apps. A framework
          // import here would be a build error for them.
          <img src={thumbnailUrl} alt="" className="size-full object-cover" />
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 border-t border-border p-3">
        <span className="truncate text-sm font-semibold">{artifact.title}</span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {artifactKindLabel(artifact.kind)} · {formatRelativeTime(stamp, now)}
        </span>
      </span>
    </>
  );

  const shell = "flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left";

  if (onOpen === undefined) {
    return <div className={shell}>{inner}</div>;
  }
  return (
    <button type="button" onClick={() => onOpen(artifact)} className={cn(shell, "w-full transition-colors hover:border-primary-emphasis")}>
      {inner}
    </button>
  );
}

export type ArtifactGalleryProps = {
  readonly request: CollectionRequest<Artifact>;
  readonly viewMode?: ViewMode;
  readonly onOpen?: (artifact: Artifact) => void;
  /** Offered from the empty state — usually the "add artifact" control. */
  readonly action?: ReactNode;
  /** Render-time for relative timestamps. */
  readonly now?: number;
  readonly className?: string;
};

/**
 * A collection of artifacts as a grid or as rows.
 *
 * Both views render the same items in the same order from the same request, so
 * toggling the layout never changes what is in front of you — a gallery whose
 * two modes disagree about the result set is a bug users report as data loss.
 *
 * The four states come from `useCollectionState`, so this makes no decisions
 * about loading or emptiness of its own. The loading state is skeleton tiles
 * *plus* a `role="status"` line: the skeletons are `aria-hidden` by design, and
 * without the status a screen-reader user gets silence where a sighted user gets
 * six pulsing boxes.
 *
 * Paging is an explicit "Load more" rather than an intersection observer.
 * Infinite scroll makes the page's end unreachable, which on a surface that
 * usually has a footer or a next section is a trap, and it takes control of
 * loading away from the person who might be on a metered connection.
 */
export function ArtifactGallery({ request, viewMode = "grid", onOpen, action, now, className }: ArtifactGalleryProps) {
  const { state, isFetching, hasNextPage, fetchNextPage } = useCollectionState(request);

  if (state.status === "loading") {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <p role="status" className="text-sm text-muted-foreground">
          Loading artifacts…
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <EmptyState
        className={className}
        icon={<FileStack />}
        title="Couldn't load artifacts"
        description={state.error.message}
      />
    );
  }

  if (state.status === "empty") {
    return (
      <EmptyState
        className={className}
        icon={<FileStack />}
        title="No artifacts yet"
        description="Anything produced here — a document, an export, a deck — shows up in this gallery."
        action={action}
      />
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)} aria-busy={isFetching}>
      {viewMode === "rows" ? (
        <Table aria-label="Artifacts">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Kind</TableHead>
              <TableHead scope="col">Owner</TableHead>
              <TableHead scope="col">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.items.map((artifact) => (
              <TableRow key={artifact.id}>
                <TableCell className="font-medium">
                  {onOpen === undefined ? (
                    artifact.title
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpen(artifact)}
                      className="rounded-sm text-left underline-offset-2 hover:underline"
                    >
                      {artifact.title}
                    </button>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{artifactKindLabel(artifact.kind)}</TableCell>
                <TableCell className="text-muted-foreground">{artifact.ownerName ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRelativeTime(artifact.updatedAt ?? artifact.createdAt, now)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
          {state.items.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              artifact={artifact}
              {...(onOpen === undefined ? {} : { onOpen })}
              {...(now === undefined ? {} : { now })}
            />
          ))}
        </div>
      )}

      {hasNextPage ? (
        <Button type="button" variant="outline" size="sm" onClick={fetchNextPage} disabled={isFetching} className="self-center">
          {isFetching ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
