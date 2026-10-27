"use client";

import { useRef } from "react";

import { cn } from "../../lib/utils.js";
import { Badge } from "../../ui/badge.js";
import { Input, Output, Thinking } from "../../ui/observability/elements.js";
import { formatDuration } from "../../ui/observability/format.js";
import type { Span, Trace } from "../../ui/observability/model.js";
import {
  STATUS_LABEL,
  STATUS_TONE,
} from "../../ui/observability/trace-header.js";
import { Run } from "../../ui/observability/trace-view.js";
import { compareSpans, type PlacedSpan } from "../../ui/observability/tree.js";
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
            <p className="font-mono text-xs text-muted-foreground">
              {metaLine(trace)}
            </p>
          </header>
          {question === undefined ? null : (
            <ReadingBlock label="Question">{question}</ReadingBlock>
          )}
          {reading.answer === undefined ? null : (
            <ReadingBlock label="Answer">{reading.answer}</ReadingBlock>
          )}
          <ReadingSteps
            placed={state.placed}
            selected={state.selected}
            select={state.select}
          />
        </article>
      )}
    </Run>
  );
}

/** The first model prompt, and the last model reply, in step order. */
export function turnReading(spans: readonly Span[]): {
  question: string | undefined;
  answer: string | undefined;
} {
  const ordered = [...spans].sort(compareSpans);
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
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
        {children}
      </p>
    </section>
  );
}

function ReadingSteps({
  placed,
  selected,
  select,
}: {
  readonly placed: readonly PlacedSpan[];
  readonly selected: Span | undefined;
  readonly select: (id: string, startMs: number) => void;
}) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  function onKey(event: {
    key: string;
    preventDefault: () => void;
    target: EventTarget | null;
  }) {
    const delta = keyDelta(event.key);
    if (delta === 0) return;
    const from = focusedStep(event.target, placed);
    if (from === undefined) return;
    const next = neighbor(placed, from, delta);
    if (next === undefined) return;
    event.preventDefault();
    select(next.span.id, next.span.startMs);
    const node = buttons.current.get(next.span.id);
    if (node !== undefined) node.focus();
  }
  return (
    <div onKeyDown={onKey}>
      {placed.map((row, index) => (
        <StepRow
          key={row.span.id}
          span={row.span}
          depth={row.depth}
          open={selected?.id === row.span.id}
          tabIndex={stepTab(row.span.id, selected?.id, index)}
          onSelect={() => select(row.span.id, row.span.startMs)}
          buttonRef={(node) => storeButton(buttons.current, row.span.id, node)}
        />
      ))}
    </div>
  );
}

function StepRow({
  span,
  depth,
  open,
  tabIndex,
  onSelect,
  buttonRef,
}: {
  readonly span: Span;
  readonly depth: number;
  readonly open: boolean;
  readonly tabIndex: number;
  readonly onSelect: () => void;
  readonly buttonRef: (node: HTMLButtonElement | null) => void;
}) {
  return (
    <div
      className={cn(
        "border-b border-border",
        open && "bg-muted/70 shadow-[inset_2px_0_0_var(--foreground)]",
      )}
    >
      <button
        type="button"
        id={span.id}
        ref={buttonRef}
        tabIndex={tabIndex}
        aria-expanded={open}
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
        {span.status === "ok" ? null : (
          <Badge tone={STATUS_TONE[span.status]} className="w-20 shrink-0">
            {STATUS_LABEL[span.status]}
          </Badge>
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
  if (
    span.input === undefined &&
    span.output === undefined &&
    span.thinking === undefined &&
    span.redacted !== true
  ) {
    return null;
  }
  return (
    <div
      className="flex flex-col gap-4 pt-2 pb-4"
      style={{ paddingLeft: 16 + depth * 14, paddingRight: 16 }}
    >
      <Thinking span={span} />
      <Input span={span} />
      <Output span={span} />
    </div>
  );
}

function focusedStep(
  target: EventTarget | null,
  placed: readonly PlacedSpan[],
): string | undefined {
  if (!(target instanceof Element)) return undefined;
  const button = target.closest("button");
  if (button === null) return undefined;
  const found = placed.some((row) => row.span.id === button.id);
  if (!found) return undefined;
  return button.id;
}

function neighbor(
  placed: readonly PlacedSpan[],
  fromId: string,
  delta: number,
): PlacedSpan | undefined {
  const current = placed.findIndex((row) => row.span.id === fromId);
  if (current < 0) return undefined;
  return placed[current + delta];
}

function stepTab(
  id: string,
  selectedId: string | undefined,
  index: number,
): number {
  if (selectedId === undefined) return index === 0 ? 0 : -1;
  return id === selectedId ? 0 : -1;
}

function storeButton(
  buttons: Map<string, HTMLButtonElement>,
  id: string,
  node: HTMLButtonElement | null,
) {
  if (node === null) buttons.delete(id);
  else buttons.set(id, node);
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
