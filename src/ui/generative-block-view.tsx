import type { CalloutTone, GenerativeBlock } from "../lib/generative-block.js";
import { cn } from "../lib/utils.js";
import { Badge, type BadgeTone } from "./badge.js";
import { Sparkline } from "./sparkline.js";
import { StatGrid, StatGridItem, type StatGridColumns } from "./stat-grid.js";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./table.js";

function kpiColumns(count: number): StatGridColumns {
  if (count >= 4) return 4;
  if (count === 3) return 3;
  return 2;
}

const CALLOUT_TONE: Record<CalloutTone, BadgeTone> = {
  neutral: "neutral",
  accent: "accent",
  info: "info",
  success: "success",
  danger: "danger",
};

function BlockTitle({ children }: { children: string }) {
  return <h3 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">{children}</h3>;
}

/**
 * Renders one `GenerativeBlock` by composing this library's own primitives —
 * `StatGrid` for `kpis`, the `Table` family for `table`, `Sparkline` for
 * `spark`, `Badge` for `callout` — rather than a bespoke chart or table for
 * generative content. The same function draws a block inline in the
 * transcript and, for the active one, again inside `RenderRail`: one renderer,
 * two places it can appear.
 */
export function GenerativeBlockView({ block, className }: { block: GenerativeBlock; className?: string }) {
  if (block.type === "kpis") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {block.title === undefined ? null : <BlockTitle>{block.title}</BlockTitle>}
        <StatGrid columns={kpiColumns(block.items.length)}>
          {block.items.map((item) => (
            <StatGridItem
              key={item.label}
              label={item.label}
              value={item.value}
              sub={item.sub}
              danger={item.danger}
              delta={
                item.delta === undefined ? undefined : (
                  <span className="font-mono text-[11px] tracking-[0.04em] text-primary-emphasis tabular-nums">
                    {item.delta}
                  </span>
                )
              }
            />
          ))}
        </StatGrid>
      </div>
    );
  }

  if (block.type === "table") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {block.title === undefined ? null : <BlockTitle>{block.title}</BlockTitle>}
        <Table aria-label={block.caption}>
          <TableCaption className="sr-only">{block.caption}</TableCaption>
          <TableHeader>
            <TableRow>
              {block.columns.map((column) => (
                <TableHead key={column} scope="col">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.rows.map((row) => (
              <TableRow key={row.join("\u0000")}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={`${cellIndex}-${cell}`}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (block.type === "spark") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {block.title === undefined ? null : <BlockTitle>{block.title}</BlockTitle>}
        <Sparkline values={block.values} summary={block.label} className="h-10 w-full" />
      </div>
    );
  }

  if (block.type === "callout") {
    return (
      <div
        className={cn(
          "flex flex-col gap-1.5 rounded-[12px] border border-border bg-card p-4",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <Badge tone={CALLOUT_TONE[block.tone ?? "neutral"]}>{block.tone ?? "note"}</Badge>
          <span className="text-sm font-semibold">{block.title}</span>
        </div>
        {block.body === undefined ? null : <p className="text-sm text-muted-foreground">{block.body}</p>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {block.title === undefined ? null : <BlockTitle>{block.title}</BlockTitle>}
      <div className="flex flex-col gap-2 text-sm leading-relaxed">
        {block.text.split(/\n{2,}/).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
