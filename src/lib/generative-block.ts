/**
 * The generative-UI payload an agent turn can carry alongside its prose.
 *
 * A discriminated union rather than one shape with optional fields — each
 * variant composes a *different* existing primitive (`StatGrid`, the `Table`
 * family, `Sparkline`, `Badge`), and a union makes that pairing exhaustive and
 * checkable instead of a runtime guess over which optional fields are set.
 *
 * Every variant carries an `id`: the render rail tracks "the latest block"
 * and "the pinned block" by identity, and a block with no stable id cannot be
 * told apart from the next one the agent produces.
 */

export type KpiItem = {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  /** Rendered as a `DeltaBadge`-style string, e.g. "+12%". Plain text — the block owns no arithmetic. */
  readonly delta?: string;
  readonly danger?: boolean;
};

export type KpisBlock = {
  readonly type: "kpis";
  readonly id: string;
  readonly title?: string;
  readonly items: readonly KpiItem[];
};

export type TableBlock = {
  readonly type: "table";
  readonly id: string;
  readonly title?: string;
  readonly caption: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
};

export type SparkBlock = {
  readonly type: "spark";
  readonly id: string;
  readonly title?: string;
  readonly label: string;
  readonly values: readonly number[];
};

export type CalloutTone = "neutral" | "accent" | "info" | "success" | "danger";

export type CalloutBlock = {
  readonly type: "callout";
  readonly id: string;
  readonly title: string;
  readonly body?: string;
  readonly tone?: CalloutTone;
};

export type MarkdownBlock = {
  readonly type: "markdown";
  readonly id: string;
  readonly title?: string;
  /** Plain text, paragraph-split on blank lines. No markdown parser ships here — see `RenderRail`. */
  readonly text: string;
};

export type GenerativeBlock = KpisBlock | TableBlock | SparkBlock | CalloutBlock | MarkdownBlock;

/** The id every variant carries, read without a switch. */
export function generativeBlockId(block: GenerativeBlock): string {
  return block.id;
}
