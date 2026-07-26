import { Check } from "lucide-react";

import { cn } from "@/registry/corbits/lib/utils";
import { ArtifactNotice } from "@/registry/corbits/ui/artifact-notice";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/registry/corbits/ui/table";

export type ComparisonVariant = {
  readonly id: string;
  /** "A" / "B", or a real name. Shown as the column heading. */
  readonly label: string;
  readonly content: string;
};

export type ComparisonCriterion = {
  readonly label: string;
  /** Score per variant id. A missing entry renders as "—", not as zero. */
  readonly scores: Readonly<Record<string, number>>;
};

export type Comparison = {
  readonly variants: readonly ComparisonVariant[];
  /** The variant that won, if the comparison reached a verdict. */
  readonly winnerId?: string;
  /** Why it won, in prose. */
  readonly rationale?: string;
  readonly criteria?: readonly ComparisonCriterion[];
};

/**
 * Reads a `Comparison` out of a JSON string, or returns `null`.
 *
 * Structural, not schema-driven: the registry ships no validation dependency,
 * and this only has to be strict enough that a malformed payload falls back to
 * showing the raw text rather than rendering half a comparison. It checks the
 * fields it will actually index and nothing else — over-validating a viewer's
 * input rejects payloads it could have drawn perfectly well.
 */
export function parseComparison(json: string): Comparison | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;

  const variants = (raw as { variants?: unknown }).variants;
  if (!Array.isArray(variants) || variants.length === 0) return null;

  const ok = variants.every(
    (variant) =>
      typeof variant === "object" &&
      variant !== null &&
      typeof (variant as ComparisonVariant).id === "string" &&
      typeof (variant as ComparisonVariant).label === "string" &&
      typeof (variant as ComparisonVariant).content === "string",
  );
  return ok ? (raw as Comparison) : null;
}

/**
 * Two or more variants of the same thing, side by side, with the verdict said
 * out loud.
 *
 * The winner is announced three ways — a text badge, a `<mark>`-free bold
 * label, and an `aria-label` on the column — and only incidentally by a tinted
 * border. Colour cannot be the encoding here: "which one won" is the single
 * fact the surface exists to communicate, and a reader who cannot see the tint
 * would otherwise get a page of undifferentiated columns.
 *
 * Columns collapse to a stack below `md`. Side-by-side is the whole idea, but a
 * 320px viewport showing two 140px columns compares nothing; stacked variants
 * with their labels intact at least remain readable.
 */
export function CompareBody({
  comparison,
  className,
}: {
  readonly comparison: Comparison;
  readonly className?: string;
}) {
  const { variants, winnerId, rationale, criteria } = comparison;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {rationale === undefined ? null : (
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{rationale}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {variants.map((variant) => {
          const won = variant.id === winnerId;
          return (
            <section
              key={variant.id}
              aria-label={won ? `${variant.label} — selected` : variant.label}
              className={cn(
                "flex flex-col gap-3 rounded-lg border p-4",
                won ? "border-primary-emphasis bg-card" : "border-border",
              )}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{variant.label}</h3>
                {won ? (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-primary-emphasis">
                    <Check className="size-3" aria-hidden />
                    Selected
                  </span>
                ) : null}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{variant.content}</p>
            </section>
          );
        })}
      </div>

      {criteria === undefined || criteria.length === 0 ? null : (
        <Table aria-label="Scores by criterion">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Criterion</TableHead>
              {variants.map((variant) => (
                <TableHead key={variant.id} scope="col" className="text-right">
                  {variant.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {criteria.map((criterion) => (
              <TableRow key={criterion.label}>
                <TableCell className="font-medium">{criterion.label}</TableCell>
                {variants.map((variant) => {
                  const score = criterion.scores[variant.id];
                  return (
                    <TableCell key={variant.id} className="text-right font-mono tabular-nums">
                      {score === undefined ? "—" : score.toLocaleString()}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

/** The JSON-string entry point, for when the payload arrives as artifact content. */
export function CompareBodyFromJson({ content, pending }: { readonly content: string; readonly pending?: boolean }) {
  if (content.trim() === "") return <ArtifactNotice pending={pending} />;
  const comparison = parseComparison(content);
  if (comparison === null) {
    // The payload is not a comparison. Showing it verbatim beats an error: the
    // content is still the artifact, and the user can read it.
    return <pre className="overflow-auto rounded-md border border-border bg-muted p-3 font-mono text-xs">{content}</pre>;
  }
  return <CompareBody comparison={comparison} />;
}
