import { ChevronRight, Paperclip } from "lucide-react";
import { useState } from "react";

import type { Part, PartToolTrace } from "../lib/chat-parts.js";
import { cn } from "../lib/utils.js";
import { BlockCard } from "./block-card.js";
import { ToolBlock, type ToolBlockState } from "./tool-block.js";

export type PartsRendererProps = {
  readonly parts: readonly Part[];
  readonly className?: string;
};

/** `1.2s`, `45s`, `3m 05s` — never a raw millisecond count. */
function formatDuration(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds < 10 ? totalSeconds.toFixed(1) : Math.round(totalSeconds)}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

/** Maps the wire's four-outcome status onto `ToolBlock`'s render-side state. */
export function toolTraceToBlockState(part: PartToolTrace): ToolBlockState {
  switch (part.status) {
    case "pending":
      return { status: "pending" };
    case "running":
      return { status: "running" };
    case "output-available":
      return { status: "output-available", output: stringifyOutput(part.output) };
    case "error":
      return { status: "error", message: stringifyOutput(part.output) };
    case "approval-requested":
      return { status: "approval-requested", reason: stringifyOutput(part.output) };
    case "output-denied":
      return { status: "output-denied", reason: stringifyOutput(part.output) };
  }
}

function stringifyOutput(output: unknown): string {
  if (output === undefined) return "";
  if (typeof output === "string") return output;
  return JSON.stringify(output, null, 2);
}

function TextPartView({ text }: { text: string }) {
  if (text.trim().length === 0) return null;
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{text}</p>;
}

/**
 * The agent's thinking, folded away, with how long it took once known.
 *
 * Closed by default, including while streaming: a block that expands itself
 * mid-stream makes the transcript jump under the reader. A native
 * `<details>`, not a div with state — it gets disclosure semantics, keyboard
 * behaviour and find-in-page expansion from the browser for free.
 */
function ReasoningPartView({ text, durationMs }: { text: string; durationMs?: number }) {
  const [open, setOpen] = useState(false);
  if (text.trim().length === 0) return null;

  return (
    <details
      data-slot="reasoning-part"
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
      className="text-xs"
    >
      <summary
        className={cn(
          // `relative` plus the `::after` pseudo-element extends the
          // effective hit area to 40px tall without changing the row's own
          // padding/density — see design-engineering.md's hit-area pattern.
          "relative flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground transition-colors after:absolute after:inset-x-0 after:top-1/2 after:h-10 after:-translate-y-1/2 hover:bg-muted hover:text-foreground",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <ChevronRight
          className={cn("size-3.5 shrink-0 transition-transform duration-200 ease-out", open && "rotate-90")}
          aria-hidden
        />
        <span>Thought{durationMs === undefined ? "" : ` for ${formatDuration(durationMs)}`}</span>
      </summary>
      {/* Keyed on `open` so the entrance animation replays every time the
          disclosure opens, not just the first time — the node persists
          (still present, natively hidden) while collapsed, preserving
          browser find-in-page's own expand-on-match behaviour. */}
      <p
        key={open ? "open" : "closed"}
        className="mt-1 ml-4 border-l border-border pl-3 leading-relaxed whitespace-pre-wrap text-muted-foreground [animation:corbits-rail-block-in_200ms_var(--ease-out)_both]"
      >
        {text}
      </p>
    </details>
  );
}

function FilePartView({ name, mediaType, url }: { name: string; mediaType: string; url?: string }) {
  const content = (
    <>
      <Paperclip className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="shrink-0 text-muted-foreground">{mediaType}</span>
    </>
  );

  if (url === undefined) {
    return (
      <span
        data-slot="file-part"
        className="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-foreground"
      >
        {content}
      </span>
    );
  }

  return (
    <a
      data-slot="file-part"
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
    >
      {content}
    </a>
  );
}

function EventPartView({ event }: { event: string }) {
  const label = event.replace(/[.-]+/g, " ");
  return (
    <div data-slot="event-part" className="flex items-center gap-2 py-1 text-xs text-muted-foreground italic">
      <span>{label}</span>
    </div>
  );
}

/**
 * A block part this renderer has no host-specific registry for. Phase 1
 * ships no generative-UI JSON-spec renderer, so a block always falls back to
 * its type name and raw payload rather than going unrendered.
 */
function BlockPartFallback({ type, data }: { type: string; data: unknown }) {
  return (
    <BlockCard title={type}>
      <pre className="max-h-64 overflow-auto font-mono text-[11px] whitespace-pre-wrap text-muted-foreground">
        {JSON.stringify(data, null, 2)}
      </pre>
    </BlockCard>
  );
}

/**
 * A `Part` whose `kind` this renderer has never heard of — a wire value
 * outside `Part`'s own union, which can only ever arrive because this
 * package validates nothing of its own (see `chat-parts.ts`). Renders a
 * neutral labeled card naming the unrecognized kind rather than rendering
 * nothing, so a producer/consumer version skew is visible in the transcript
 * instead of silently swallowing content.
 */
function UnknownPartFallback({ kind }: { kind: string }) {
  return (
    <div
      data-slot="unknown-part"
      className="rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground"
    >
      Unsupported part: <span className="font-mono">{kind}</span>
    </div>
  );
}

/**
 * Renders an ordered `Part[]` in the order the model produced it: text as
 * prose, reasoning as a closed disclosure, tool calls through `ToolBlock`,
 * files as an attachment chip, events as an inline system line, any block
 * part as a labeled fallback card, and any `kind` outside the `Part` union
 * itself as a neutral unknown-part fallback — the host's own generative-UI
 * registry, if it has one, renders blocks by intercepting `kind: "block"`
 * before it reaches this component.
 *
 * An empty `parts` array renders nothing — no placeholder, no empty-state
 * chrome. A message with no parts is not a message a transcript should show
 * anything for.
 */
export function PartsRenderer({ parts, className }: PartsRendererProps) {
  if (parts.length === 0) return null;

  return (
    <div data-slot="parts-renderer" className={cn("flex flex-col gap-1.5", className)}>
      {parts.map((part, index) => {
        const key = `${part.kind}-${index}`;
        switch (part.kind) {
          case "text":
            return <TextPartView key={key} text={part.text} />;
          case "reasoning":
            return <ReasoningPartView key={key} text={part.text} durationMs={part.durationMs} />;
          case "tool-trace":
            return (
              <ToolBlock
                key={key}
                name={part.name}
                input={part.input}
                state={toolTraceToBlockState(part)}
              />
            );
          case "file":
            return <FilePartView key={key} name={part.name} mediaType={part.mediaType} url={part.url} />;
          case "event":
            return <EventPartView key={key} event={part.event} />;
          case "block":
            return <BlockPartFallback key={key} type={part.block.type} data={part.block.data} />;
          default:
            return <UnknownPartFallback key={key} kind={(part as { kind: string }).kind} />;
        }
      })}
    </div>
  );
}
