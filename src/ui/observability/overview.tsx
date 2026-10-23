"use client";

import { Button } from "../button.js";
import { StatGrid, StatGridItem } from "../stat-grid.js";
import { AreaChart } from "./area-chart.js";
import { formatCost, formatDuration, formatTokens } from "./format.js";
import { observationRows, portfolio, rollup, usageOf } from "./metrics.js";
import type { SeriesPoint, SessionSummary, Trace } from "./model.js";
import { UsageMix } from "./usage-mix.js";

export function WeekOverview({
  series,
  failures,
  sessions,
  traces,
  onOpen,
}: {
  readonly series: readonly SeriesPoint[];
  readonly failures?: readonly SeriesPoint[];
  readonly sessions: readonly SessionSummary[];
  readonly traces: readonly Trace[];
  readonly onOpen: () => void;
}) {
  const failed = sessions.filter(
    (session) => session.status === "error",
  ).length;
  const tokens = sessions.reduce((sum, session) => sum + session.tokens, 0);
  const cost = traces.reduce((sum, trace) => sum + rollup(trace).costUsd, 0);
  const usage = traces.reduce(
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
  const steps = observationRows(traces).length;
  return (
    <section className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">This week</h1>
        <Button variant="outline" onClick={() => onOpen()}>
          Open sessions
        </Button>
      </div>
      <StatGrid>
        <StatGridItem
          label="Sessions"
          value={String(sessions.length)}
          sparklineValues={series.map((point) => point.value)}
          sparklineLabel="Sessions across the week"
        />
        <StatGridItem label="Observations" value={String(steps)} />
        <StatGridItem label="Cost" value={formatCost(cost)} />
        <StatGridItem
          label="Tokens"
          value={formatTokens(tokens)}
          sub={`${failed} failed`}
        />
      </StatGrid>
      <div className="grid gap-4 lg:grid-cols-2">
        <AreaChart
          title="Sessions"
          description="Completed runs, and the runs that failed, by day."
          data={series}
          {...(failures === undefined ? {} : { compare: failures })}
          valueLabel="Sessions"
          compareLabel="Failed"
        />
        <UsageMix usage={usage} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Cost by model</h2>
          <ul className="flex flex-col text-sm">
            {shares.map((share) => (
              <li
                key={`${share.provider}/${share.model}`}
                className="flex justify-between gap-3 border-b border-border py-1.5 font-mono text-xs"
              >
                <span>
                  {share.provider} / {share.model}
                </span>
                <span>
                  {formatCost(share.costUsd)} · {formatTokens(share.tokens)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Latency by run</h2>
          <ul className="flex flex-col text-sm">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex justify-between gap-3 border-b border-border py-1.5 font-mono text-xs"
              >
                <span className="truncate">{session.name}</span>
                <span className="shrink-0">
                  {formatDuration(session.durationMs)} ·{" "}
                  {formatCost(session.costUsd)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
