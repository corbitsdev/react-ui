"use client";

import { Star, Workflow } from "lucide-react";

import { useCollectionState } from "@/registry/corbits/hooks/use-collection-state";
import type { CollectionRequest } from "@/registry/corbits/lib/data-port";
import { cn } from "@/registry/corbits/lib/utils";
import { Badge } from "@/registry/corbits/ui/badge";
import { Button } from "@/registry/corbits/ui/button";
import { EmptyState } from "@/registry/corbits/ui/empty-state";
import type { IntakeField } from "@/registry/corbits/ui/intake-form";

/** One thing the user can run. */
export type WorkflowOffering = {
  /** Stable identifier for the kind, e.g. `daily-brief`. */
  readonly kind: string;
  /** Human title. Already humanised — this file does not guess at casing. */
  readonly title: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly favorite?: boolean;
  /** Inputs this offering asks for. Drives the run-once panel. */
  readonly fields?: readonly IntakeField[];
};

export type WorkflowCatalogProps = {
  readonly request: CollectionRequest<WorkflowOffering>;
  readonly selectedKind?: string | null;
  readonly onSelect: (offering: WorkflowOffering) => void;
  readonly onToggleFavorite?: (offering: WorkflowOffering) => void;
  /** Rendered under the selected card — the run-once panel goes here. */
  readonly renderDetail?: (offering: WorkflowOffering) => React.ReactNode;
  readonly className?: string;
};

/**
 * What the user can start. DataPort-backed like every other collection here, so
 * its loading, error and empty states come from `useCollectionState` rather
 * than being spelled out again.
 *
 * Favourites are a callback, not local state: the star has to survive a reload
 * to mean anything, so the host owns it and this renders what it is told.
 */
export function WorkflowCatalog({
  request,
  selectedKind = null,
  onSelect,
  onToggleFavorite,
  renderDetail,
  className,
}: WorkflowCatalogProps) {
  const { state, isFetching, refetch } = useCollectionState(request);

  if (state.status === "loading") {
    return (
      <p role="status" className="px-3 py-6 text-sm text-muted-foreground">
        Loading workflows…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div className="px-3 py-6">
        <p className="text-sm">{state.error.message}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={refetch}>
          Try again
        </Button>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <EmptyState
        icon={<Workflow />}
        title="No workflows yet"
        description="Anything published to this workbench shows up here, ready to run."
      />
    );
  }

  return (
    <ul aria-label="Workflows" aria-busy={isFetching} className={cn("grid gap-2.5 sm:grid-cols-2", className)}>
      {state.items.map((offering) => {
        const selected = offering.kind === selectedKind;
        return (
          <li
            key={offering.kind}
            className={cn(
              "flex flex-col rounded-lg border transition-colors",
              selected ? "border-primary-emphasis bg-primary/10" : "border-border bg-card",
              // A selected card with a detail panel spans the grid, so the
              // panel gets the full width instead of a half-width column.
              selected && renderDetail !== undefined && "sm:col-span-2",
            )}
          >
            <div className="flex items-start gap-2 p-3.5">
              <button
                type="button"
                onClick={() => onSelect(offering)}
                aria-pressed={selected}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{offering.title}</span>
                  {(offering.tags ?? []).map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </span>
                {offering.description === undefined ? null : (
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {offering.description}
                  </span>
                )}
              </button>
              {onToggleFavorite === undefined ? null : (
                <button
                  type="button"
                  onClick={() => onToggleFavorite(offering)}
                  aria-pressed={offering.favorite === true}
                  aria-label={offering.favorite === true ? `Unfavourite ${offering.title}` : `Favourite ${offering.title}`}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Star
                    className={cn("size-4", offering.favorite === true && "fill-current text-primary-emphasis")}
                    aria-hidden
                  />
                </button>
              )}
            </div>
            {selected && renderDetail !== undefined ? (
              <div className="border-t border-border p-3.5">{renderDetail(offering)}</div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
