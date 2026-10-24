"use client";

import { useMemo, useState } from "react";

import { Button } from "../../ui/button.js";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog.js";
import { EmptyState } from "../../ui/empty-state.js";
import { Input } from "../../ui/input.js";
import type {
  SeriesPoint,
  SessionSummary,
  Trace,
} from "../../ui/observability/model.js";
import { RunList } from "../../ui/observability/elements.js";
import { Observations } from "../../ui/observability/observations.js";
import { WeekOverview } from "../../ui/observability/overview.js";
import { AuditRun } from "./audit-run.js";

export type ObservabilityAppProps = {
  readonly sessions: readonly SessionSummary[];
  readonly traces: Readonly<Record<string, Trace>>;
  readonly series: readonly SeriesPoint[];
  readonly failures?: readonly SeriesPoint[];
};

type Screen = "week" | "runs" | "steps" | "run";

export function ObservabilityApp({
  sessions,
  traces,
  series,
  failures,
}: ObservabilityAppProps) {
  const [screen, setScreen] = useState<Screen>("week");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusSpan, setFocusSpan] = useState<string | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      sessions.filter((session) => {
        if (query.length === 0) return true;
        const haystack =
          `${session.name} ${session.actor} ${session.model}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [sessions, query],
  );

  const trace = openId === null ? undefined : traces[openId];

  function openTrace(id: string, spanId?: string) {
    setOpenId(id);
    setFocusSpan(spanId);
    setScreen("run");
  }

  return (
    <div className="flex h-[900px] overflow-hidden rounded-lg border border-border bg-background text-foreground">
      <nav className="flex w-52 shrink-0 flex-col gap-1 border-r border-border bg-card p-3">
        <p className="px-2 pb-2 text-sm font-semibold">Observe</p>
        <NavButton
          current={screen === "week"}
          onClick={() => setScreen("week")}
        >
          Week
        </NavButton>
        <NavButton
          current={screen === "runs"}
          onClick={() => setScreen("runs")}
        >
          Runs
        </NavButton>
        <NavButton
          current={screen === "steps"}
          onClick={() => setScreen("steps")}
        >
          Steps
        </NavButton>
        <div className="mt-auto border-t border-border pt-3">
          <Button className="w-full" onClick={() => setAdding(true)}>
            Add agent
          </Button>
        </div>
      </nav>
      <main className="min-w-0 flex-1 overflow-auto">
        {screen === "week" ? (
          <WeekOverview
            series={series}
            {...(failures === undefined ? {} : { failures })}
            sessions={sessions}
            traces={Object.values(traces)}
            onOpen={() => setScreen("runs")}
          />
        ) : null}
        {screen === "runs" ? (
          <section className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h1 className="text-xl font-semibold">Runs</h1>
              <Input
                aria-label="Search runs"
                placeholder="Search name, actor, or model"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="max-w-xs"
              />
            </div>
            {visible.length === 0 ? (
              <EmptyState
                title="No runs match"
                description="Clear the search."
              />
            ) : (
              <RunList
                traces={visible.flatMap((session) => {
                  const run = traces[session.id];
                  return run === undefined ? [] : [run];
                })}
                onOpen={(id) => openTrace(id)}
              />
            )}
          </section>
        ) : null}
        {screen === "steps" ? (
          <Observations
            traces={Object.values(traces)}
            onOpen={(traceId, spanId) => openTrace(traceId, spanId)}
          />
        ) : null}
        {screen === "run" ? (
          trace === undefined ? (
            <EmptyState
              title="No run open"
              description="Choose one from Runs."
            />
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-border px-3 py-2">
                <button
                  type="button"
                  className="text-xs text-muted-foreground"
                  onClick={() => setScreen("runs")}
                >
                  Runs
                </button>
              </div>
              <AuditRun
                key={`${trace.id}:${focusSpan ?? ""}`}
                trace={trace}
                {...(focusSpan === undefined ? {} : { focusSpan })}
              />
            </div>
          )
        ) : null}
      </main>
      {adding ? (
        <AddAgent
          token={token}
          onClose={() => setAdding(false)}
          onMint={(name) => {
            const slug = name
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");
            setToken(`obs_${slug}_${Math.random().toString(36).slice(2, 10)}`);
          }}
        />
      ) : null}
    </div>
  );
}

function NavButton({
  current,
  onClick,
  children,
}: {
  current: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-current={current ? "page" : undefined}
      onClick={onClick}
      className={
        current
          ? "rounded-md bg-muted px-2 py-1.5 text-left text-sm font-medium"
          : "rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted/70"
      }
    >
      {children}
    </button>
  );
}

function AddAgent({
  token,
  onClose,
  onMint,
}: {
  token: string | null;
  onClose: () => void;
  onMint: (name: string) => void;
}) {
  const [name, setName] = useState("editor");
  const label = name.trim();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an agent</DialogTitle>
          <DialogDescription>
            A token is shown once. The machine that runs the agent keeps it.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <label className="flex flex-col gap-1 text-sm">
            Name
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {token === null ? null : (
            <p className="mt-3 rounded-md bg-muted p-2 font-mono text-xs">
              {token}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            disabled={label.length === 0 || token !== null}
            onClick={() => onMint(label)}
          >
            Mint token
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
