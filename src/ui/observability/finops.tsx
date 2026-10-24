import { StatGrid, StatGridItem } from "../stat-grid.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table.js";
import { CostBars } from "./cost-bars.js";
import {
  formatCost,
  formatDuration,
  formatSpeed,
  formatTokens,
} from "./format.js";
import { Ledger } from "./ledger.js";
import {
  modelShares,
  portfolio,
  rollup,
  usageOf,
  type UsageBreakdown,
} from "./metrics.js";
import type { Trace } from "./model.js";
import { UsageMix } from "./usage-mix.js";

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
