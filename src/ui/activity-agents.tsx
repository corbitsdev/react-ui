"use client";

import { ArrowUp, Ban, Check, ChevronRight, CircleAlert } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { ActivityStep } from "../lib/conversation-activity.js";
import { toolTitle } from "../lib/tool-display.js";
import { cn } from "../lib/utils.js";
import { ActivitySpinner } from "./activity-spinner.js";
import { Button } from "./button.js";
import { ConfirmButton } from "./confirm-button.js";
import { Input } from "./input.js";

/** Where an agent's run stands. */
export type ActivityAgentState =
  | "starting"
  | "working"
  | "waiting"
  | "done"
  | "stopped"
  | "failed";

/** What a working agent is producing right now, from its own stream. */
export type ActivityAgentPreview = {
  readonly kind: "writing" | "thinking";
  readonly text: string;
};

/** What a waiting agent asks the person. */
export type ActivityAgentQuestion = {
  readonly text: string;
  /** Short answers offered as one-tap choices. */
  readonly options?: readonly string[] | undefined;
  /** Offer to leave the choice to the agent. Defaults to true. */
  readonly canDecide?: boolean | undefined;
};

/** How the person answered a question. */
export type ActivityAnswer =
  | { readonly kind: "option"; readonly value: string }
  | { readonly kind: "reply"; readonly text: string }
  | { readonly kind: "decide" };

/** One agent the main thread handed work to. */
export type ActivityAgent = {
  readonly id: string;
  /** Who does the work: "Designer". Agents next to each other with the same role show as one team. */
  readonly role: string;
  /** Which one, inside its team: "Friendly". Falls back to `task`. */
  readonly name?: string | undefined;
  /** What it does, in the tense of its state: "Writing the requirements", "Wrote the requirements". */
  readonly task: string;
  readonly state: ActivityAgentState;
  /** When it started, in ms since the epoch. */
  readonly startedAt: number;
  /** When it ended; its clock stops here. */
  readonly endedAt?: number | undefined;
  /** Its own steps, in order. */
  readonly steps: readonly ActivityStep[];
  /** What it is doing this moment, in plain words. Defaults to its newest step. */
  readonly now?: string | undefined;
  readonly preview?: ActivityAgentPreview | undefined;
  /** While waiting: what it asks. */
  readonly question?: ActivityAgentQuestion | undefined;
  /** What it was asked to do. */
  readonly instruction?: string | undefined;
  /** What it reported when it finished. */
  readonly report?: ReactNode | undefined;
  /** What it made: the title names it in the row, the content shows it. */
  readonly result?:
    | { readonly title: string; readonly content?: ReactNode }
    | undefined;
  /** Opens what it makes as it makes it; offered while it works. */
  readonly onWatch?: (() => void) | undefined;
  readonly watchLabel?: string | undefined;
  /** Stops it once the person confirms; offered while it works. */
  readonly onStop?: (() => void) | undefined;
  /** Opens what it made; offered once it is done. */
  readonly onOpen?: (() => void) | undefined;
  readonly onAnswer?: ((answer: ActivityAnswer) => void) | undefined;
};

export type ActivityAgentsLabels = {
  /** A team's line: "3 designers working", "3 designers". */
  readonly team: (role: string, count: number, running: boolean) => string;
  readonly progress: (done: number, total: number) => string;
  readonly needsYou: (count: number) => string;
  readonly outcome: (counts: {
    readonly done: number;
    readonly stopped: number;
    readonly failed: number;
  }) => string;
  readonly starting: string;
  readonly thinking: string;
  readonly calls: (count: number) => string;
  readonly waiting: string;
  readonly done: string;
  readonly filed: (title: string) => string;
  readonly stopped: string;
  readonly failed: string;
  readonly steps: (count: number) => string;
  readonly duration: (ms: number) => string;
  readonly preview: string;
  readonly askedTo: string;
  readonly askedEach: string;
  readonly more: string;
  readonly less: string;
  readonly watch: string;
  readonly stop: string;
  readonly stopConfirm: string;
  readonly open: string;
  readonly somethingElse: string;
  readonly letDecide: string;
  readonly reply: (name: string) => string;
  readonly replyPlaceholder: (name: string) => string;
  readonly send: string;
  readonly sent: (answer: string) => string;
};

/** "45s", "11m", "1h 05m". */
function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

const LABELS: ActivityAgentsLabels = {
  team: (role, count, running) =>
    `${count} ${role.toLowerCase()}s${running ? " working" : ""}`,
  progress: (done, total) => `${done} of ${total} done`,
  needsYou: (count) => `${count} needs you`,
  outcome: ({ done, stopped, failed }) =>
    [
      `${done} done`,
      ...(stopped > 0 ? [`${stopped} stopped`] : []),
      ...(failed > 0 ? [`${failed} failed`] : []),
    ].join(", "),
  starting: "Starting",
  thinking: "Thinking",
  calls: (count) => `Running ${count} at once`,
  waiting: "Paused for your answer",
  done: "Done",
  filed: (title) => `Filed ${title}`,
  stopped: "Stopped",
  failed: "Failed",
  steps: (count) => `${count} ${count === 1 ? "step" : "steps"}`,
  duration: formatDuration,
  preview: "What it is writing",
  askedTo: "Asked to",
  askedEach: "Asked each to",
  more: "More",
  less: "Less",
  watch: "Watch",
  stop: "Stop",
  stopConfirm: "Stop it",
  open: "Open",
  somethingElse: "Something else",
  letDecide: "Let it decide",
  reply: (name) => `Reply to ${name}`,
  replyPlaceholder: (name) => `Tell ${name} what you want`,
  send: "Send",
  sent: (answer) => `You said “${answer}”`,
};

export type ActivityAgentsProps = {
  readonly agents: readonly ActivityAgent[];
  /**
   * Draws an opened agent's own steps. `Activity` passes its own step list;
   * without it each step shows as one line.
   */
  readonly renderSteps?: ((agent: ActivityAgent) => ReactNode) | undefined;
  readonly labels?: Partial<ActivityAgentsLabels> | undefined;
  readonly className?: string | undefined;
};

const isActive = (agent: ActivityAgent) =>
  agent.state === "starting" ||
  agent.state === "working" ||
  agent.state === "waiting";

const ORDER: Record<ActivityAgentState, number> = {
  waiting: 0,
  working: 1,
  starting: 1,
  done: 2,
  failed: 3,
  stopped: 3,
};

/** What needs you first, then what is moving, then what is done. Stable. */
function sorted(agents: readonly ActivityAgent[]): readonly ActivityAgent[] {
  return agents
    .map((agent, index) => ({ agent, index }))
    .toSorted(
      (a, b) =>
        ORDER[a.agent.state] - ORDER[b.agent.state] || a.index - b.index,
    )
    .map(({ agent }) => agent);
}

/** Agents next to each other with the same role, as teams. */
function teamsOf(
  agents: readonly ActivityAgent[],
): readonly (readonly ActivityAgent[])[] {
  const teams: ActivityAgent[][] = [];
  for (const agent of agents) {
    const last = teams.at(-1);
    if (last?.[0]?.role === agent.role) last.push(agent);
    else teams.push([agent]);
  }
  return teams;
}

function shared(team: readonly ActivityAgent[]): string | undefined {
  const [first] = team;
  if (first?.instruction === undefined || team.length < 2) return undefined;
  return team.every((agent) => agent.instruction === first.instruction)
    ? first.instruction
    : undefined;
}

/** A clock that ticks once a second, only while something runs. */
function useNow(live: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [live]);
  return now;
}

const durationOf = (agent: ActivityAgent, now: number) =>
  (agent.endedAt ?? now) - agent.startedAt;

/**
 * The agents the main thread handed work to, as calm rows. Agents with the
 * same role next to each other read as one team under a line that counts
 * them ("3 designers working · 1 of 3 done · 1 needs you"), open while any
 * runs; once the person opens or closes it, their choice holds.
 *
 * Each row is the agent's name and one line that changes with its state:
 * what it is doing now, rolling to the next step as it moves; that it waits
 * for you; what it filed; that it stopped. Its clock stops when it ends. A
 * waiting agent's question sits right under its row with its answers, a
 * reply field and "Let it decide". Pointing at a row or focusing it shows
 * Watch, Stop (confirmed) or Open in place of its step count; opening it
 * shows what it is writing, capped and following the newest text, its
 * steps, and the same actions for touch.
 *
 * Spinners pause while the list is out of view.
 */
export function ActivityAgents({
  agents,
  renderSteps,
  labels: labelOverrides,
  className,
}: ActivityAgentsProps) {
  const labels = { ...LABELS, ...labelOverrides };
  const now = useNow(agents.some(isActive));
  const root = useRef<HTMLDivElement | null>(null);
  const shown = agents.length > 0;

  // Re-run when the list appears, so an empty first render still gets watched.
  useEffect(() => {
    const element = root.current;
    if (element === null || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry === undefined) return;
      element.toggleAttribute("data-offscreen", !entry.isIntersecting);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [shown]);

  if (!shown) return null;
  const context = { now, labels, renderSteps };
  return (
    <div
      ref={root}
      data-slot="activity-agents"
      className={cn(
        "flex min-w-0 flex-col gap-3 text-sm data-offscreen:[&_*]:[animation-play-state:paused]",
        className,
      )}
    >
      {teamsOf(agents).map((team) => {
        const [only] = team;
        return team.length === 1 && only !== undefined ? (
          <Solo key={only.id} agent={only} {...context} />
        ) : (
          <Team key={team[0]?.id} team={team} {...context} />
        );
      })}
    </div>
  );
}

type Context = {
  readonly now: number;
  readonly labels: ActivityAgentsLabels;
  readonly renderSteps: ((agent: ActivityAgent) => ReactNode) | undefined;
};

function Team({
  team,
  now,
  labels,
  renderSteps,
}: Context & {
  readonly team: readonly ActivityAgent[];
}) {
  const running = team.some(isActive);
  // Open while any runs; once the person toggles it, their choice wins.
  const [chosen, setChosen] = useState<boolean | undefined>(undefined);
  const open = chosen ?? running;
  const id = useId();
  const instruction = shared(team);
  const count = (state: ActivityAgentState) =>
    team.filter((agent) => agent.state === state).length;
  const waiting = count("waiting");
  const longest = Math.max(...team.map((agent) => durationOf(agent, now)));
  const role = team[0]?.role ?? "";
  return (
    <section className="flex flex-col gap-1.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setChosen(!open)}
        className="group/head -mx-2 flex items-baseline gap-2 rounded-lg px-2 py-1 text-start"
      >
        <span className="min-w-0 text-balance">
          <span className="font-medium text-foreground">
            {labels.team(role, team.length, running)}
          </span>
          <span className="text-muted-foreground">
            {" · "}
            {running
              ? labels.progress(count("done"), team.length)
              : labels.outcome({
                  done: count("done"),
                  stopped: count("stopped"),
                  failed: count("failed"),
                })}
          </span>
          {waiting > 0 ? (
            <span className="text-foreground">
              {" · "}
              <span
                aria-hidden
                className="me-1 inline-block size-1.5 -translate-y-px rounded-full bg-primary"
              />
              {labels.needsYou(waiting)}
            </span>
          ) : null}
        </span>
        <span className="ms-auto flex shrink-0 items-center gap-1.5 font-mono text-xs text-muted-foreground tabular-nums">
          {labels.duration(longest)}
          <ChevronRight
            aria-hidden
            className={cn(
              "size-3.5 opacity-60 group-hover/head:opacity-100 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out",
              open && "rotate-90",
            )}
          />
        </span>
      </button>
      {open ? (
        <div
          id={id}
          className="flex flex-col gap-2 motion-safe:animate-[corbits-fade-in_150ms_ease-out]"
        >
          {instruction === undefined ? null : (
            <Instruction
              label={labels.askedEach}
              text={instruction}
              labels={labels}
            />
          )}
          <ul className="-mx-2 flex flex-col">
            {sorted(team).map((agent) => (
              <Row
                key={agent.id}
                agent={agent}
                now={now}
                labels={labels}
                renderSteps={renderSteps}
                inTeam
                sharedInstruction={instruction !== undefined}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** One agent alone: its row, what it made, its report, then its instruction. */
function Solo({
  agent,
  now,
  labels,
  renderSteps,
}: Context & {
  readonly agent: ActivityAgent;
}) {
  return (
    <section className="flex flex-col gap-2">
      <ul className="-mx-2 flex flex-col">
        <Row
          agent={agent}
          now={now}
          labels={labels}
          renderSteps={renderSteps}
        />
      </ul>
      {agent.result?.content}
      {agent.report === undefined ? null : (
        <div className="text-pretty text-foreground/75">{agent.report}</div>
      )}
      {agent.instruction === undefined ? null : (
        <Instruction
          label={labels.askedTo}
          text={agent.instruction}
          labels={labels}
        />
      )}
    </section>
  );
}

/** What an agent was asked, held to two lines until asked for. */
function Instruction({
  label,
  text,
  labels,
}: {
  readonly label: string;
  readonly text: string;
  readonly labels: ActivityAgentsLabels;
}) {
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  const body = useRef<HTMLParagraphElement | null>(null);
  const id = useId();
  useLayoutEffect(() => {
    const element = body.current;
    if (element !== null && !open)
      setLong(element.scrollHeight > element.clientHeight + 1);
  }, [text, open]);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p
        ref={body}
        id={id}
        className={cn(
          "max-w-prose text-pretty text-foreground/70",
          !open && "line-clamp-2",
        )}
      >
        {text}
      </p>
      {long || open ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className="self-start rounded-sm text-xs text-muted-foreground underline decoration-border-strong underline-offset-2 hover:text-foreground"
        >
          {open ? labels.less : labels.more}
        </button>
      ) : null}
    </div>
  );
}

function StateMark({ state }: { readonly state: ActivityAgentState }) {
  switch (state) {
    case "starting":
    case "working":
      return <ActivitySpinner />;
    case "waiting":
      return (
        <span
          aria-hidden
          className="size-2 rounded-full bg-primary ring-4 ring-primary/15"
        />
      );
    case "stopped":
      return <Ban aria-hidden className="size-3.5 text-muted-foreground" />;
    case "failed":
      return <CircleAlert aria-hidden className="size-3.5 text-destructive" />;
    case "done":
      return <Check aria-hidden className="size-3.5 text-muted-foreground" />;
  }
}

/** What the agent is doing this moment, from its newest step. */
function nowLine(agent: ActivityAgent, labels: ActivityAgentsLabels): string {
  if (agent.now !== undefined) return agent.now;
  const last = agent.steps.at(-1);
  if (last === undefined) return labels.starting;
  switch (last.kind) {
    case "reasoning":
      return labels.thinking;
    case "tool-trace":
      return toolTitle(last.name).action;
    case "tool-batch":
      return labels.calls(last.tools.length);
  }
}

function SecondLine({
  agent,
  labels,
}: {
  readonly agent: ActivityAgent;
  readonly labels: ActivityAgentsLabels;
}) {
  switch (agent.state) {
    case "starting":
      return <>{labels.starting}</>;
    case "working": {
      const line = nowLine(agent, labels);
      return (
        // Keyed on the step, so a new step rolls in and the same one holds.
        <span
          key={`${agent.steps.length}-${line}`}
          className="block truncate motion-safe:animate-[corbits-activity-roll_180ms_ease-out_both]"
        >
          {line}
        </span>
      );
    }
    case "waiting":
      return <>{labels.waiting}</>;
    case "stopped":
      return <>{labels.stopped}</>;
    case "failed":
      return <span className="text-destructive">{labels.failed}</span>;
    case "done":
      return (
        <span className="block truncate">
          {agent.result === undefined
            ? labels.done
            : labels.filed(agent.result.title)}
        </span>
      );
  }
}

const quiet =
  "h-6 px-2 text-xs font-normal text-muted-foreground hover:text-foreground";

/** The quiet actions a row offers, by state. */
function Actions({
  agent,
  labels,
}: {
  readonly agent: ActivityAgent;
  readonly labels: ActivityAgentsLabels;
}) {
  const name = agent.name ?? agent.role;
  if (agent.state === "working" || agent.state === "starting")
    return (
      <>
        {agent.onWatch === undefined ? null : (
          <Button
            variant="ghost"
            size="sm"
            onClick={agent.onWatch}
            aria-label={`${agent.watchLabel ?? labels.watch}: ${name}`}
            className={quiet}
          >
            {agent.watchLabel ?? labels.watch}
          </Button>
        )}
        {agent.onStop === undefined ? null : (
          <ConfirmButton
            variant="ghost"
            size="sm"
            onConfirm={agent.onStop}
            confirmLabel={labels.stopConfirm}
            aria-label={`${labels.stop}: ${name}`}
            className={quiet}
          >
            {labels.stop}
          </ConfirmButton>
        )}
      </>
    );
  if (agent.state === "done" && agent.onOpen !== undefined)
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={agent.onOpen}
        aria-label={`${labels.open}: ${agent.result?.title ?? name}`}
        className={quiet}
      >
        {labels.open}
      </Button>
    );
  return null;
}

function Row({
  agent,
  now,
  labels,
  renderSteps,
  inTeam = false,
  sharedInstruction = false,
}: Context & {
  readonly agent: ActivityAgent;
  /** In a team, the row names the agent; alone, its role and task. */
  readonly inTeam?: boolean;
  readonly sharedInstruction?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const toggle = useRef<HTMLButtonElement | null>(null);
  const working = agent.state === "working" || agent.state === "starting";
  const waiting = agent.state === "waiting" && agent.question !== undefined;
  const hasActions =
    (working && (agent.onWatch !== undefined || agent.onStop !== undefined)) ||
    (agent.state === "done" && agent.onOpen !== undefined);
  const title = inTeam
    ? (agent.name ?? agent.task)
    : `${agent.role} · ${agent.task}`;
  return (
    <li
      data-state={agent.state}
      className={cn(
        "group/row flex flex-col rounded-lg transition-colors duration-150",
        // The row that needs you is a card of its own; the rest stay flat.
        waiting
          ? "my-1 border border-border bg-background shadow-xs"
          : "hover:bg-muted/70",
        open && !waiting && "bg-muted/50",
      )}
    >
      <div className="flex min-h-11 items-center pe-1.5">
        <button
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onClick={() => setOpen(!open)}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-start"
        >
          {/* One fixed slot: the state, or a chevron while pointed at. */}
          <span className="grid size-4 shrink-0 place-items-center *:col-start-1 *:row-start-1">
            <span className="grid place-items-center transition-opacity duration-150 group-hover/row:opacity-0 pointer-coarse:opacity-100">
              <StateMark state={agent.state} />
            </span>
            <ChevronRight
              aria-hidden
              className={cn(
                "size-3.5 text-muted-foreground opacity-0 transition duration-150 ease-out group-hover/row:opacity-100 pointer-coarse:opacity-0",
                open && "rotate-90",
              )}
            />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-foreground">{title}</span>
            <span className="relative h-4 overflow-hidden text-xs text-muted-foreground">
              <SecondLine agent={agent} labels={labels} />
            </span>
          </span>
        </button>
        {/* The step count and clock, or the actions over them while the row
            is pointed at or focused; one grid cell, so the row keeps its
            width. Touch reaches the actions by opening the row. */}
        <span className="grid shrink-0 items-center justify-items-end *:col-start-1 *:row-start-1">
          <span
            className={cn(
              "font-mono text-xs text-muted-foreground tabular-nums transition-opacity duration-150",
              hasActions &&
                !open &&
                "group-focus-within/row:opacity-0 group-hover/row:opacity-0 pointer-coarse:opacity-100",
            )}
          >
            {agent.steps.length > 0
              ? `${labels.steps(agent.steps.length)} · `
              : null}
            {labels.duration(durationOf(agent, now))}
          </span>
          {hasActions && !open ? (
            <span className="pointer-events-none flex items-center opacity-0 transition-opacity duration-150 group-focus-within/row:pointer-events-auto group-focus-within/row:opacity-100 group-hover/row:pointer-events-auto group-hover/row:opacity-100 pointer-coarse:hidden">
              <Actions agent={agent} labels={labels} />
            </span>
          ) : null}
        </span>
      </div>
      {waiting && agent.question !== undefined ? (
        <Ask
          // A new question starts a new ask.
          key={agent.question.text}
          agent={agent}
          question={agent.question}
          labels={labels}
          onAnswered={() => toggle.current?.focus()}
        />
      ) : null}
      {open ? (
        <div
          id={id}
          className="flex flex-col gap-3 ps-8.5 pe-3 pb-3 motion-safe:animate-[corbits-fade-in_150ms_ease-out]"
        >
          {working && agent.preview !== undefined ? (
            <Preview preview={agent.preview} labels={labels} />
          ) : null}
          {inTeam ? agent.result?.content : null}
          {inTeam && agent.report !== undefined ? (
            <div className="text-pretty text-foreground/75">{agent.report}</div>
          ) : null}
          {inTeam && !sharedInstruction && agent.instruction !== undefined ? (
            <Instruction
              label={labels.askedTo}
              text={agent.instruction}
              labels={labels}
            />
          ) : null}
          {agent.steps.length === 0 ? null : renderSteps !== undefined ? (
            renderSteps(agent)
          ) : (
            <StepLines steps={agent.steps} />
          )}
          {hasActions ? (
            <div className="-ms-2 flex items-center">
              <Actions agent={agent} labels={labels} />
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/** Without a step renderer: each step as one line. */
function StepLines({ steps }: { readonly steps: readonly ActivityStep[] }) {
  return (
    <ol className="flex flex-col gap-1 text-muted-foreground">
      {steps.map((step, index) => (
        <li key={index} className="truncate">
          {step.kind === "tool-trace"
            ? toolTitle(step.name).action
            : step.kind === "tool-batch"
              ? step.tools.map((tool) => toolTitle(tool.name).action).join(", ")
              : step.text.split("\n")[0]}
        </li>
      ))}
    </ol>
  );
}

/**
 * The question in full under the row, answerable in one tap: its own
 * answers, your own words, or leave it to the agent. Once answered it says
 * what you said until the agent moves on.
 */
function Ask({
  agent,
  question,
  labels,
  onAnswered,
}: {
  readonly agent: ActivityAgent;
  readonly question: ActivityAgentQuestion;
  readonly labels: ActivityAgentsLabels;
  readonly onAnswered: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState<string | undefined>(undefined);
  const other = useRef<HTMLButtonElement | null>(null);
  const name = agent.name ?? agent.role;
  const answer = (value: ActivityAnswer, said: string) => {
    agent.onAnswer?.(value);
    setSent(said);
    onAnswered();
  };
  return (
    <div className="flex flex-col gap-2.5 ps-8.5 pe-3 pb-3">
      <p className="text-pretty text-foreground">{question.text}</p>
      {sent !== undefined ? (
        <p role="status" className="text-xs text-muted-foreground">
          {labels.sent(sent)}
        </p>
      ) : replying ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const reply = text.trim();
            if (reply !== "") answer({ kind: "reply", text: reply }, reply);
          }}
          className="flex items-center gap-1.5"
        >
          <Input
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              setReplying(false);
              requestAnimationFrame(() => other.current?.focus());
            }}
            aria-label={labels.reply(name)}
            placeholder={labels.replyPlaceholder(name)}
            className="h-8"
          />
          <Button
            type="submit"
            size="icon"
            aria-label={labels.send}
            disabled={text.trim() === ""}
            className="size-8"
          >
            <ArrowUp aria-hidden />
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {(question.options ?? []).map((option) => (
            <Button
              key={option}
              variant="outline"
              size="sm"
              onClick={() => answer({ kind: "option", value: option }, option)}
              className="h-7 px-2.5 text-xs"
            >
              {option}
            </Button>
          ))}
          <Button
            ref={other}
            variant="ghost"
            size="sm"
            onClick={() => setReplying(true)}
            className="h-7 px-2.5 text-xs font-normal text-muted-foreground hover:text-foreground"
          >
            {labels.somethingElse}
          </Button>
          {question.canDecide === false ? null : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => answer({ kind: "decide" }, labels.letDecide)}
              className="h-7 px-2.5 text-xs font-normal text-muted-foreground hover:text-foreground"
            >
              {labels.letDecide}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * What a working agent is producing, capped at 120px. It follows the newest
 * text until the person scrolls up to read, and picks up again once they are
 * back at the end.
 */
function Preview({
  preview,
  labels,
}: {
  readonly preview: ActivityAgentPreview;
  readonly labels: ActivityAgentsLabels;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const following = useRef(true);
  useLayoutEffect(() => {
    const element = box.current;
    if (element !== null && following.current)
      element.scrollTop = element.scrollHeight;
  }, [preview.text]);
  return (
    <div
      ref={box}
      role="log"
      aria-label={labels.preview}
      tabIndex={0}
      onScroll={(event) => {
        const element = event.currentTarget;
        following.current =
          element.scrollHeight - element.scrollTop - element.clientHeight < 8;
      }}
      className="max-h-30 overflow-y-auto overscroll-contain rounded-lg bg-background px-3 py-2 ring-1 ring-border"
    >
      {preview.kind === "writing" ? (
        <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {preview.text}
        </pre>
      ) : (
        <p className="text-xs text-pretty text-muted-foreground italic">
          {preview.text}
        </p>
      )}
    </div>
  );
}
