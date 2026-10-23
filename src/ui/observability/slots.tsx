"use client";

import { seriesColor } from "../../lib/chart-palette.js";
import { StatGrid, StatGridItem } from "../stat-grid.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table.js";
import {
  formatCost,
  formatDuration,
  formatSpeed,
  formatTokens,
} from "./format.js";
import {
  measures,
  modelShares,
  portfolio,
  rollup,
  shapeOf,
  stepKeys,
  usageOf,
  type MeasureSort,
  type UsageBreakdown,
} from "./metrics.js";
import type { Trace } from "./model.js";
import { stepTitle } from "./wording.js";

export function WorkflowsFinOps({
  traces,
}: {
  readonly traces: readonly Trace[];
}) {
  const totals = traces.map((trace) => rollup(trace));
  const cost = totals.reduce((sum, row) => sum + row.costUsd, 0);
  const tokens = totals.reduce((sum, row) => sum + row.tokens, 0);
  const failed = traces.filter(
    (trace) => trace.status === "error" || trace.status === "denied",
  ).length;
  const usage = traces.reduce<UsageBreakdown>(
    (sum, trace) => {
      const part = usageOf(trace);
      return {
        input: sum.input + part.input,
        output: sum.output + part.output,
        cacheRead: sum.cacheRead + part.cacheRead,
        cacheWrite: sum.cacheWrite + part.cacheWrite,
        thinking: sum.thinking + part.thinking,
      };
    },
    { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, thinking: 0 },
  );
  const shares = portfolio(traces);
  return (
    <section className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold">Runs</h2>
        <p className="text-sm text-muted-foreground">{traces.length} runs</p>
      </div>
      <StatGrid columns={4}>
        <StatGridItem label="Runs" value={String(traces.length)} />
        <StatGridItem label="Cost" value={formatCost(cost)} emphasis />
        <StatGridItem label="Tokens" value={formatTokens(tokens)} />
        <StatGridItem
          label="Failed"
          value={String(failed)}
          danger={failed > 0}
        />
      </StatGrid>
      <div className="grid gap-4 lg:grid-cols-2">
        <CostBars
          title="Cost by model"
          description="What each provider billed across these runs."
          rows={shares.map((share) => ({
            key: `${share.provider}/${share.model}`,
            label: `${share.provider} / ${share.model}`,
            value: share.costUsd,
            detail: formatTokens(share.tokens),
          }))}
        />
        <UsageMix usage={usage} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Run</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Tokens</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {traces.map((trace) => {
            const row = rollup(trace);
            return (
              <TableRow key={trace.id}>
                <TableCell>{trace.name}</TableCell>
                <TableCell className="font-mono">
                  {formatCost(row.costUsd)}
                </TableCell>
                <TableCell className="font-mono">
                  {formatTokens(row.tokens)}
                </TableCell>
                <TableCell className="font-mono">
                  {formatDuration(row.durationMs)}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {trace.status}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}

export function WorkflowFinOps({ trace }: { readonly trace: Trace }) {
  const totals = rollup(trace);
  const perThousand =
    totals.tokens === 0 ? 0 : totals.costUsd / (totals.tokens / 1000);
  const shares = modelShares(trace);
  return (
    <section className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold">{trace.name}</h2>
        <p className="font-mono text-xs text-muted-foreground">
          {trace.actor} · {trace.startedAt}
        </p>
      </div>
      <StatGrid columns={4}>
        <StatGridItem
          label="Cost"
          value={formatCost(totals.costUsd)}
          emphasis
        />
        <StatGridItem
          label="Tokens"
          value={formatTokens(totals.tokens)}
          sub={
            totals.cachedTokens === 0
              ? "No cached input"
              : `${formatTokens(totals.cachedTokens)} cached`
          }
        />
        <StatGridItem label="Per 1k tokens" value={formatCost(perThousand)} />
        <StatGridItem
          label="Speed"
          value={formatSpeed(totals.tokensPerSecond)}
          sub={formatDuration(totals.durationMs)}
        />
      </StatGrid>
      <div className="grid gap-4 lg:grid-cols-2">
        <CostBars
          title="Cost by model"
          description="What each provider billed on this run."
          rows={shares.map((share) => ({
            key: `${share.provider}/${share.model}`,
            label: `${share.provider} / ${share.model}`,
            value: share.costUsd,
            detail: formatTokens(share.tokens),
          }))}
        />
        <div className="flex flex-col gap-4">
          <UsageMix usage={usageOf(trace)} />
          <ProviderNotes shares={shares} />
        </div>
      </div>
      <Ledger trace={trace} sort="cost" />
    </section>
  );
}

function ProviderNotes({ shares }: { shares: ReturnType<typeof modelShares> }) {
  if (shares.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Model notes</h3>
      <ul className="flex flex-col gap-2">
        {shares.map((share) => (
          <li key={`${share.provider}/${share.model}`} className="text-sm">
            <p className="font-mono text-xs">
              {share.provider} / {share.model}
            </p>
            {share.quirks.length === 0 ? (
              <p className="text-muted-foreground">No recorded quirks.</p>
            ) : (
              <p className="text-muted-foreground">
                {share.quirks.join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Ledger({
  trace,
  sort,
  selectedId,
  onSelect,
}: {
  readonly trace: Trace;
  readonly sort: MeasureSort;
  readonly selectedId?: string;
  readonly onSelect?: (id: string) => void;
}) {
  const rows = measures(trace, sort);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Step</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Tokens</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Speed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const span = trace.spans.find((item) => item.id === row.id);
          const title = span === undefined ? row.name : stepTitle(span);
          return (
            <TableRow
              key={row.id}
              className={row.id === selectedId ? "bg-muted/70" : undefined}
            >
              <TableCell>
                {onSelect === undefined ? (
                  title
                ) : (
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => onSelect(row.id)}
                  >
                    {title}
                  </button>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {row.provider === "—" ? "—" : `${row.provider}/${row.model}`}
              </TableCell>
              <TableCell className="font-mono">
                {row.tokens === 0 ? "—" : formatTokens(row.tokens)}
              </TableCell>
              <TableCell className="font-mono">
                {row.costUsd === 0 ? "—" : formatCost(row.costUsd)}
              </TableCell>
              <TableCell className="font-mono">
                {formatDuration(row.durationMs)}
              </TableCell>
              <TableCell className="font-mono">
                {formatSpeed(row.tokensPerSecond)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function CostPicture({ trace }: { readonly trace: Trace }) {
  const priced = measures(trace, "cost").filter((row) => row.costUsd > 0);
  return (
    <CostBars
      title="Cost by step"
      description="Each priced step, largest first."
      rows={priced.map((row) => {
        const span = trace.spans.find((item) => item.id === row.id);
        return {
          key: row.id,
          label: span === undefined ? row.name : stepTitle(span),
          value: row.costUsd,
          detail: formatTokens(row.tokens),
        };
      })}
    />
  );
}

const USAGE_PARTS = [
  ["input", "Input"],
  ["output", "Output"],
  ["cacheRead", "Cache read"],
  ["cacheWrite", "Cache write"],
  ["thinking", "Thinking"],
] as const;

const USAGE_BAR = {
  input: seriesColor(0),
  output: seriesColor(1),
  cacheRead: seriesColor(3),
  cacheWrite: seriesColor(2),
  thinking: "color-mix(in oklab, var(--foreground) 55%, transparent)",
} as const;

export function UsageMix({ usage }: { readonly usage: UsageBreakdown }) {
  const max = Math.max(
    1,
    usage.input,
    usage.output,
    usage.cacheRead,
    usage.cacheWrite,
    usage.thinking,
  );
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Usage</h3>
      <p className="text-xs text-muted-foreground">
        Cache read is a slice of input, not an extra charge on top of it.
      </p>
      <ul className="flex flex-col gap-1.5">
        {USAGE_PARTS.map(([key, label]) => {
          const value = usage[key];
          return (
            <li
              key={key}
              className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-2"
            >
              <span className="text-xs">{label}</span>
              <span className="h-2.5 rounded-sm bg-muted">
                <span
                  className="block h-full rounded-sm"
                  style={{
                    width: `${(value / max) * 100}%`,
                    backgroundColor: USAGE_BAR[key],
                  }}
                />
              </span>
              <span className="text-right font-mono text-xs">
                {value === 0 ? "—" : formatTokens(value)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Shape({ trace }: { readonly trace: Trace }) {
  const nodes = shapeOf(trace);
  const keys = stepKeys(trace.spans);
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold">Shape</h3>
        <p className="text-xs text-muted-foreground">
          Steps that share a name collapse into one node. The count is how many
          times it ran.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Node</TableHead>
            <TableHead>Count</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Tokens</TableHead>
            <TableHead>Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {nodes.map((node) => (
            <TableRow key={node.key}>
              <TableCell>
                <span className="block truncate">
                  {titlesFor(trace, keys, node.key)}
                </span>
              </TableCell>
              <TableCell className="font-mono">{node.count}</TableCell>
              <TableCell className="font-mono">
                {formatDuration(node.durationMs)}
              </TableCell>
              <TableCell className="font-mono">
                {node.tokens === 0 ? "—" : formatTokens(node.tokens)}
              </TableCell>
              <TableCell className="font-mono">
                {node.costUsd === 0 ? "—" : formatCost(node.costUsd)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function titlesFor(
  trace: Trace,
  keys: ReadonlyMap<string, string>,
  nodeKey: string,
): string {
  const titles: string[] = [];
  for (const span of trace.spans) {
    const full = keys.get(span.id) ?? span.id;
    if (full.replace(/\.\d+$/, "") !== nodeKey) continue;
    const title = stepTitle(span);
    if (!titles.includes(title)) titles.push(title);
  }
  return titles.join(" · ");
}

function CostBars({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: readonly {
    key: string;
    label: string;
    value: number;
    detail: string;
  }[];
}) {
  const max = Math.max(0.0001, ...rows.map((row) => row.value));
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.key}
            className="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-3"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-xs">{row.label}</p>
              <div className="mt-1 h-2 rounded-sm bg-muted">
                <div
                  className="h-full rounded-sm bg-foreground/70"
                  style={{ width: `${(row.value / max) * 100}%` }}
                />
              </div>
            </div>
            <p className="text-right font-mono text-xs">
              {formatCost(row.value)}
              <span className="block text-muted-foreground">{row.detail}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
