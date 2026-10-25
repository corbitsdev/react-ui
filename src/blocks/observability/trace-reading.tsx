import { cn } from "../../lib/utils.js";
import { Input, Output, Thinking } from "../../ui/observability/elements.js";
import { formatDuration } from "../../ui/observability/format.js";
import type { Span, Trace } from "../../ui/observability/model.js";
import { STATUS_LABEL } from "../../ui/observability/trace-header.js";
import { Run } from "../../ui/observability/trace-view.js";
import type { PlacedSpan } from "../../ui/observability/tree.js";
import { rowMarker, stepTitle } from "../../ui/observability/wording.js";

/**
 * A trace as something to read. The question and the model's last reply come
 * first. The steps follow, and choosing one shows what it was given and what
 * it returned. Playback stays on `AuditRun`.
 */
export function TraceReading({ trace }: { readonly trace: Trace }) {
  const reading = turnReading(trace.spans);
  const question = sameText(reading.question, trace.name)
    ? undefined
    : reading.question;
  return (
    <Run trace={trace} className="min-h-0 flex-1" defaultSelectedId="">
      {(state) => (
        <article className="min-h-0 flex-1 overflow-auto">
          <header className="flex flex-col gap-2 border-b border-border px-4 py-4">
            <h1 className="text-lg font-semibold text-foreground">
              {trace.name}
            </h1>
            <p className="text-sm text-muted-foreground">{metaLine(trace)}</p>
          </header>
          {question === undefined ? null : (
            <ReadingBlock label="Question">{question}</ReadingBlock>
          )}
          {reading.answer === undefined ? null : (
            <ReadingBlock label="Answer">{reading.answer}</ReadingBlock>
          )}
          <div
            role="listbox"
            aria-label="Steps"
            aria-activedescendant={
              state.selected === undefined ? undefined : state.selected.id
            }
            tabIndex={0}
            className="outline-none"
            onKeyDown={(event) =>
              onStepKey(event, state.placed, state.selected, state.select)
            }
          >
            {state.placed.map((row) => (
              <StepRow
                key={row.span.id}
                span={row.span}
                depth={row.depth}
                open={state.selected?.id === row.span.id}
                onSelect={() => state.select(row.span.id, row.span.startMs)}
              />
            ))}
          </div>
        </article>
      )}
    </Run>
  );
}

/** The first model prompt, and the last model reply, in start order. */
export function turnReading(spans: readonly Span[]): {
  question: string | undefined;
  answer: string | undefined;
} {
  const ordered = [...spans].sort(byStart);
  let question: string | undefined;
  let answer: string | undefined;
  for (const span of ordered) {
    if (span.kind !== "turn") continue;
    const input = textOf(span.input);
    if (question === undefined && input !== undefined) question = input;
    const output = textOf(span.output);
    if (output !== undefined) answer = output;
  }
  return { question, answer };
}

function ReadingBlock({
  label,
  children,
}: {
  readonly label: string;
  readonly children: string;
}) {
  return (
    <section className="border-b border-border px-4 py-4">
      <h2 className="text-xs font-medium text-muted-foreground">{label}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
        {children}
      </p>
    </section>
  );
}

function StepRow({
  span,
  depth,
  open,
  onSelect,
}: {
  readonly span: Span;
  readonly depth: number;
  readonly open: boolean;
  readonly onSelect: () => void;
}) {
  const mark = span.status === "ok" ? "" : STATUS_LABEL[span.status];
  return (
    <div
      className={cn(
        "border-b border-border",
        open && "bg-muted/70 shadow-[inset_2px_0_0_var(--foreground)]",
      )}
    >
      <button
        type="button"
        role="option"
        id={span.id}
        aria-selected={open}
        className="flex w-full min-w-0 items-center gap-3 py-2 text-left"
        style={{ paddingLeft: 16 + depth * 14, paddingRight: 16 }}
        onClick={onSelect}
      >
        <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">
          {rowMarker(span)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">
          {stepTitle(span)}
        </span>
        {mark.length === 0 ? null : (
          <span className="shrink-0 text-xs text-destructive">{mark}</span>
        )}
        <span className="w-16 shrink-0 text-right font-mono text-xs text-muted-foreground">
          {formatDuration(span.durationMs)}
        </span>
      </button>
      {open ? <StepBody span={span} depth={depth} /> : null}
    </div>
  );
}

function StepBody({
  span,
  depth,
}: {
  readonly span: Span;
  readonly depth: number;
}) {
  return (
    <div
      className="flex flex-col gap-3 pb-4"
      style={{ paddingLeft: 16 + depth * 14, paddingRight: 16 }}
    >
      <Thinking span={span} />
      <Input span={span} />
      <Output span={span} />
    </div>
  );
}

function onStepKey(
  event: { key: string; preventDefault: () => void },
  placed: readonly PlacedSpan[],
  selected: Span | undefined,
  select: (id: string, startMs: number) => void,
) {
  const delta = keyDelta(event.key);
  if (delta === 0) return;
  event.preventDefault();
  const current =
    selected === undefined
      ? -1
      : placed.findIndex((row) => row.span.id === selected.id);
  const next = placed[fromIndex(current, delta, placed.length) + delta];
  if (next === undefined) return;
  select(next.span.id, next.span.startMs);
}

function fromIndex(current: number, delta: number, length: number): number {
  if (current >= 0) return current;
  if (delta > 0) return -1;
  return length;
}

function keyDelta(key: string): number {
  if (key === "ArrowDown") return 1;
  if (key === "ArrowUp") return -1;
  return 0;
}

function metaLine(trace: Trace): string {
  const parts: string[] = [];
  if (trace.actor.length > 0) parts.push(trace.actor);
  parts.push(STATUS_LABEL[trace.status]);
  parts.push(formatDuration(trace.durationMs));
  return parts.join(" · ");
}

function sameText(left: string | undefined, right: string): boolean {
  if (left === undefined) return false;
  return left === right.trim();
}

function textOf(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const text = value.trim();
  if (text.length === 0) return undefined;
  return text;
}

function byStart(left: Span, right: Span): number {
  if (left.startMs !== right.startMs) return left.startMs - right.startMs;
  if (left.name < right.name) return -1;
  if (left.name > right.name) return 1;
  return 0;
}
