import { cn } from "../lib/utils.js";

export const CATALOG_GLYPH_KINDS = ["code", "doc", "grid", "nodes"] as const;
export type CatalogGlyphKind = (typeof CATALOG_GLYPH_KINDS)[number];

/**
 * Stable hash of a string. Deterministic so a catalog grid looks varied but
 * never reshuffles between renders — a tile that changes its face on refresh is
 * worse than one with no face at all.
 */
export function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

/** The glyph a given id always gets. */
export function glyphKindFor(id: string): CatalogGlyphKind {
  return CATALOG_GLYPH_KINDS[hashString(id) % CATALOG_GLYPH_KINDS.length] ?? "grid";
}

const PATHS: Record<CatalogGlyphKind, readonly string[]> = {
  code: ["M44 26 L28 40 L44 54", "M76 26 L92 40 L76 54", "M64 22 L56 58"],
  doc: ["M40 22 h30 l12 12 v24 a4 4 0 0 1 -4 4 h-38 a4 4 0 0 1 -4 -4 v-32 a4 4 0 0 1 4 -4 z", "M50 44 h20", "M50 52 h14"],
  grid: ["M34 24 h22 v22 h-22 z", "M64 24 h22 v22 h-22 z", "M34 54 h22 v14 h-22 z", "M64 54 h22 v14 h-22 z"],
  nodes: ["M36 40 h20", "M64 28 h20", "M64 52 h20", "M60 40 L64 28", "M60 40 L64 52"],
};

/**
 * A decorative face for a catalog tile whose subject has no artwork of its own.
 *
 * Drawn in `currentColor` on a tokened surface rather than the app's original
 * white-on-brand-fill palette. That version needed four saturated fills and a
 * white stroke, which is a second colour system to keep contrast-tested; taking
 * its colour from context means it is correct in both themes for free.
 *
 * Always `aria-hidden`. It is generated from a hash and carries no information
 * — the tile's title is the content, and announcing "nodes glyph" tells the
 * user nothing true about the thing.
 */
export function CatalogGlyph({
  /** Anything stable about the subject — its id, its kind. Picks the glyph. */
  seed,
  kind,
  className,
}: {
  seed: string;
  /** Force a glyph instead of deriving it. */
  kind?: CatalogGlyphKind;
  className?: string;
}) {
  const resolved = kind ?? glyphKindFor(seed);

  return (
    <span
      aria-hidden
      className={cn(
        "grid h-20 w-full place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground",
        className,
      )}
    >
      <svg viewBox="0 0 120 80" fill="none" className="size-full">
        {PATHS[resolved].map((path) => (
          <path
            key={path}
            d={path}
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </span>
  );
}
