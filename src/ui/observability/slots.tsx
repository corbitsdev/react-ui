"use client";

import { cn } from "../../lib/utils.js";
import { StatGrid, StatGridItem } from "../stat-grid.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table.js";
import { Badge } from "../badge.js";
import {
  formatCost,
  formatDuration,
  formatSpeed,
  formatTokens,
} from "./format.js";
import {
  findings,
  measures,
  modelShares,
  rollup,
  shapeOf,
  stepKeys,
  usageOf,
  type Finding,
  type MeasureSort,
  type UsageBreakdown,
} from "./metrics.js";
import type { Audience, Trace } from "./model.js";
import { phrase, stepTitle, type Wording } from "./wording.js";

export function AudienceBand({
  audience,
  trace,
  peers = [],
  onOpen,
  wording,
}: {
  readonly audience: Audience;
  readonly trace: Trace;
  readonly peers?: readonly Trace[];
  readonly onOpen?: (id: string) => void;
  readonly wording: Wording;
}) {
  if (audience === "operator") return null;
  const totals = rollup(trace);
  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
      {audience === "cfo" ? <FinanceBand trace={trace} totals={totals} peers={peers} onOpen={onOpen} /> : null}
      {audience === "coo" ? <OperationsBand trace={trace} totals={totals} wording={wording} /> : null}
      {audience === "ciso" ? <SecurityBand trace={trace} totals={totals} wording={wording} /> : null}
    </div>
  );
}

function FinanceBand({
  trace,
  totals,
  peers,
  onOpen,
}: {
  trace: Trace;
  totals: ReturnType<typeof rollup>;
  peers: readonly Trace[];
  onOpen?: ((id: string) => void) | undefined;
}) {
  const perThousand = totals.tokens === 0 ? 0 : totals.costUsd / (totals.tokens / 1000);
  const shares = modelShares(trace);
  return (
    <>
      <StatGrid columns={4}>
        <StatGridItem label="Cost" value={formatCost(totals.costUsd)} emphasis />
        <StatGridItem
          label="Tokens"
          value={formatTokens(totals.tokens)}
          sub={totals.cachedTokens === 0 ? "No cached input" : `${formatTokens(totals.cachedTokens)} cached`}
        />
        <StatGridItem label="Per 1k tokens" value={formatCost(perThousand)} />
        <StatGridItem label="Speed" value={formatSpeed(totals.tokensPerSecond)} sub={formatDuration(totals.durationMs)} />
      </StatGrid>
      <div className="grid gap-3 lg:grid-cols-2">
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
        <div className="flex flex-col gap-3">
          <UsageMix usage={usageOf(trace)} />
          <ProviderNotes shares={shares} />
        </div>
      </div>
      {peers.length < 2 ? null : <Compare peers={peers} currentId={trace.id} onOpen={onOpen} />}
    </>
  );
}

function OperationsBand({
  trace,
  totals,
  wording,
}: {
  trace: Trace;
  totals: ReturnType<typeof rollup>;
  wording: Wording;
}) {
  return (
    <>
      <StatGrid columns={4}>
        <StatGridItem label="Duration" value={formatDuration(totals.durationMs)} emphasis />
        <StatGridItem label={phrase(wording, "Provision", "Setup")} value={formatDuration(totals.provisionMs)} />
        <StatGridItem
          label="Waiting"
          value={formatDuration(totals.waitingMs)}
          danger={totals.waitingMs > 0}
        />
        <StatGridItem label="Speed" value={formatSpeed(totals.tokensPerSecond)} />
      </StatGrid>
      <ProviderNotes shares={modelShares(trace)} />
    </>
  );
}

function SecurityBand({
  trace,
  totals,
  wording,
}: {
  trace: Trace;
  totals: ReturnType<typeof rollup>;
  wording: Wording;
}) {
  const items = findings(trace);
  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        <Identity trace={trace} wording={wording} />
        <StatGrid columns={2}>
          <StatGridItem label="Denied" value={String(totals.denied)} danger={totals.denied > 0} />
          <StatGridItem label="Blocked" value={String(totals.blocked)} danger={totals.blocked > 0} />
          <StatGridItem label="External calls" value={String(totals.externalHops)} />
          <StatGridItem
            label="Bad signatures"
            value={String(totals.badSignatures)}
            danger={totals.badSignatures > 0}
          />
        </StatGrid>
      </div>
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">
          {phrase(wording, "What left the grant", "What was blocked or left the network")}
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {phrase(
              wording,
              "No denies, blocks, or external calls.",
              "Nothing was blocked, and nothing left the network.",
            )}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                <Badge tone={item.tone === "danger" ? "danger" : "warning"}>
                  {item.tone === "danger"
                    ? phrase(wording, "Deny", "Blocked")
                    : phrase(wording, "Watch", "Check")}
                </Badge>
                <span className="font-medium">{findingTitle(trace, item, wording)}</span>
                <span className="text-muted-foreground">{item.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Identity({ trace, wording }: { trace: Trace; wording: Wording }) {
  const principal = trace.principal;
  const tenant = trace.tenant;
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <h3 className="text-sm font-semibold">Who ran it</h3>
      {principal === undefined ? (
        <p className="text-sm text-muted-foreground">
          {phrase(wording, "No principal on this run.", "No person recorded for this run.")}
        </p>
      ) : (
        <dl className="grid grid-cols-[6rem_1fr] gap-y-1 font-mono text-xs">
          <dt className="text-muted-foreground">{phrase(wording, "Principal", "Person")}</dt>
          <dd>{principal.name}</dd>
          <dt className="text-muted-foreground">Id</dt>
          <dd>{principal.id}</dd>
          <dt className="text-muted-foreground">Kind</dt>
          <dd>{principal.kind}</dd>
          <dt className="text-muted-foreground">Key</dt>
          <dd>{principal.keyId}</dd>
          <dt className="text-muted-foreground">{phrase(wording, "Tenant", "Workspace")}</dt>
          <dd>{tenant === undefined ? "—" : `${tenant.name} · ${tenant.id}`}</dd>
        </dl>
      )}
    </section>
  );
}

function findingTitle(trace: Trace, item: Finding, wording: Wording): string {
  const span = trace.spans.find((candidate) => item.id.startsWith(`${candidate.id}:`));
  if (span === undefined) return item.title;
  if (
    item.id === `${span.id}:deny` ||
    item.id === `${span.id}:block` ||
    item.id === `${span.id}:sig`
  ) {
    return stepTitle(span, wording);
  }
  return item.title;
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
              <p className="text-muted-foreground">{share.quirks.join(" · ")}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Compare({
  peers,
  currentId,
  onOpen,
}: {
  readonly peers: readonly Trace[];
  readonly currentId: string;
  readonly onOpen?: ((id: string) => void) | undefined;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Compare runs</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Run</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Tokens</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Speed</TableHead>
            <TableHead>Denied</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {peers.map((peer) => {
            const totals = rollup(peer);
            const current = peer.id === currentId;
            return (
              <TableRow key={peer.id} className={current ? "bg-muted/70" : undefined}>
                <TableCell>
                  {onOpen === undefined ? (
                    peer.name
                  ) : (
                    <button
                      type="button"
                      className="text-left font-medium underline-offset-2 hover:underline"
                      onClick={() => onOpen(peer.id)}
                      aria-current={current ? "true" : undefined}
                    >
                      {peer.name}
                    </button>
                  )}
                </TableCell>
                <TableCell className="font-mono">{formatCost(totals.costUsd)}</TableCell>
                <TableCell className="font-mono">{formatTokens(totals.tokens)}</TableCell>
                <TableCell className="font-mono">{formatDuration(totals.durationMs)}</TableCell>
                <TableCell className="font-mono">{formatSpeed(totals.tokensPerSecond)}</TableCell>
                <TableCell className="font-mono">{totals.denied}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}

export function Ledger({
  trace,
  sort,
  selectedId,
  onSelect,
  wording,
}: {
  readonly trace: Trace;
  readonly sort: MeasureSort;
  readonly selectedId?: string;
  readonly onSelect?: (id: string) => void;
  readonly wording: Wording;
}) {
  const rows = measures(trace, sort);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {wording === "precise" ? <TableHead>Key</TableHead> : null}
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
          const title = span === undefined ? row.name : stepTitle(span, wording);
          return (
          <TableRow key={row.id} className={row.id === selectedId ? "bg-muted/70" : undefined}>
            {wording === "precise" ? <TableCell className="font-mono text-xs">{row.key}</TableCell> : null}
            <TableCell>
              {onSelect === undefined ? (
                title
              ) : (
                <button type="button" className="text-left" onClick={() => onSelect(row.id)}>
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
            <TableCell className="font-mono">{row.costUsd === 0 ? "—" : formatCost(row.costUsd)}</TableCell>
            <TableCell className="font-mono">{formatDuration(row.durationMs)}</TableCell>
            <TableCell className="font-mono">{formatSpeed(row.tokensPerSecond)}</TableCell>
          </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function CostPicture({ trace, wording }: { readonly trace: Trace; readonly wording: Wording }) {
  const priced = measures(trace, "cost").filter((row) => row.costUsd > 0);
  return (
    <CostBars
      title="Cost by step"
      description="Each priced step, largest first."
      rows={priced.map((row) => {
        const span = trace.spans.find((item) => item.id === row.id);
        return {
          key: row.id,
          label: span === undefined ? row.name : stepTitle(span, wording),
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
  input: "bg-chart-1",
  output: "bg-chart-2",
  cacheRead: "bg-chart-4",
  cacheWrite: "bg-chart-3",
  thinking: "bg-foreground/55",
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
            <li key={key} className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-2">
              <span className="text-xs">{label}</span>
              <span className="h-2.5 rounded-sm bg-muted">
                <span
                  className={cn("block h-full rounded-sm", USAGE_BAR[key])}
                  style={{ width: `${(value / max) * 100}%` }}
                />
              </span>
              <span className="text-right font-mono text-xs">{value === 0 ? "—" : formatTokens(value)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Shape({ trace, wording }: { readonly trace: Trace; readonly wording: Wording }) {
  const nodes = shapeOf(trace);
  const keys = stepKeys(trace.spans);
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold">Shape</h3>
        <p className="text-xs text-muted-foreground">
          Steps that share a name collapse into one node. The count is how many times it ran.
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
                <span className="block truncate">{titlesFor(trace, keys, node.key, wording)}</span>
                {wording === "precise" ? (
                  <span className="block font-mono text-[10px] text-muted-foreground">{node.key}</span>
                ) : null}
              </TableCell>
              <TableCell className="font-mono">{node.count}</TableCell>
              <TableCell className="font-mono">{formatDuration(node.durationMs)}</TableCell>
              <TableCell className="font-mono">{node.tokens === 0 ? "—" : formatTokens(node.tokens)}</TableCell>
              <TableCell className="font-mono">{node.costUsd === 0 ? "—" : formatCost(node.costUsd)}</TableCell>
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
  wording: Wording,
): string {
  const titles: string[] = [];
  for (const span of trace.spans) {
    const full = keys.get(span.id) ?? span.id;
    if (full.replace(/\.\d+$/, "") !== nodeKey) continue;
    const title = stepTitle(span, wording);
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
  rows: readonly { key: string; label: string; value: number; detail: string }[];
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
          <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-3">
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
