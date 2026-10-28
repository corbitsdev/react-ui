"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ComponentProps, FocusEvent, ReactNode } from "react";

import {
  groupActivity,
  isAwaitingApproval,
  type ActivityStep,
  type ConversationPartGroup,
} from "../lib/conversation-activity.js";
import type {
  ConversationPart,
  PartBlock,
  PartEvent,
  PartFile,
  PartImage,
  PartSources,
  PartText,
  PartTool,
  PartToolBatch,
} from "../lib/conversation.js";
import { cn } from "../lib/utils.js";
import {
  Activity,
  ActivityContent,
  ActivityTrigger,
  type ActivityContentProps,
} from "./activity.js";
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  Attachments,
} from "./attachments.js";
import { ConversationNotice } from "./conversation-divider.js";
import { GeneratedImages } from "./generated-images.js";
import { MessageContent, useMessageContext } from "./message.js";
import { Source, Sources } from "./sources.js";
import { ToolApproval, type ToolApprovalDecision } from "./tool-approval.js";
import { ToolGroup } from "./tool-group.js";

/**
 * A message's parts as `MessageParts` lays them out: each run of thinking and
 * tool work as one `activity`, each run of files as one `files` row, and
 * every other part on its own. A tool call or batch that stands as a `part`
 * is one waiting on a person.
 */
type PartsGroup =
  | {
      readonly kind: "activity";
      readonly key: string;
      readonly steps: readonly ActivityStep[];
    }
  | {
      readonly kind: "files";
      readonly key: string;
      readonly files: readonly PartFile[];
    }
  | {
      readonly kind: "part";
      readonly key: string;
      readonly part: Exclude<ConversationPart, PartFile>;
    };

function groupParts(parts: readonly ConversationPart[]): readonly PartsGroup[] {
  const groups: PartsGroup[] = [];
  // The open run of files; the group pushed for it holds this same array.
  let files: PartFile[] | null = null;
  for (const group of groupActivity(parts)) {
    if (group.kind === "part" && group.part.kind === "file") {
      if (files === null) {
        files = [];
        groups.push({ kind: "files", key: group.key, files });
      }
      files.push(group.part);
      continue;
    }
    files = null;
    if (group.kind === "activity") groups.push(group);
    else if (group.part.kind !== "file")
      groups.push({ kind: "part", key: partKey(group), part: group.part });
  }
  return groups;
}

/**
 * A waiting call is keyed by its id, not by where it stands, so a part
 * dropped before it does not remount its buttons and drop focus with them.
 */
function partKey(group: ConversationPartGroup & { kind: "part" }): string {
  const { part } = group;
  if (part.kind === "tool-trace") return `tool-trace-${part.toolCallId}`;
  if (part.kind === "tool-batch") return `tool-batch-${part.id}`;
  return group.key;
}

function toolsOf(part: ConversationPart): readonly PartTool[] {
  if (part.kind === "tool-trace") return [part];
  if (part.kind === "tool-batch") return part.tools;
  return [];
}

function partsIn(group: PartsGroup): readonly ConversationPart[] {
  switch (group.kind) {
    case "activity":
      return group.steps;
    case "files":
      return group.files;
    case "part":
      return [group.part];
  }
}

function findTool(
  parts: readonly ConversationPart[],
  toolCallId: string,
): PartTool | undefined {
  return parts.flatMap(toolsOf).find((tool) => tool.toolCallId === toolCallId);
}

/** The group holding a call, and the index in `parts` of the part holding it. */
function placeOf(
  groups: readonly PartsGroup[],
  toolCallId: string,
): { readonly group: PartsGroup; readonly index: number } | undefined {
  let index = 0;
  for (const group of groups)
    for (const part of partsIn(group)) {
      if (toolsOf(part).some((tool) => tool.toolCallId === toolCallId))
        return { group, index };
      index += 1;
    }
  return undefined;
}

/** The group laid out from the part at `index` in `parts`. */
function groupAt(
  groups: readonly PartsGroup[],
  index: number,
): PartsGroup | undefined {
  if (index < 0) return undefined;
  let end = 0;
  return groups.find((group) => {
    end += partsIn(group).length;
    return index < end;
  });
}

/**
 * A call whose buttons may go away with focus on them: one just decided, or
 * one waiting with focus inside. `groups` is the layout it was last seen in.
 */
type Leaving = {
  readonly toolCallId: string;
  readonly groups: readonly PartsGroup[];
};

const WAITING = "[data-slot='tool-approval'][data-status='pending']";

/**
 * The waiting call whose card holds `element`: a call standing on its own,
 * or, in a batch, the waiting card it is in, counted in order.
 */
function waitingCallAt(
  element: Element,
  groups: readonly PartsGroup[],
): PartTool | undefined {
  const holder = element.closest("[data-part-key]");
  const key = holder?.getAttribute("data-part-key");
  const group = groups.find((candidate) => candidate.key === key);
  if (holder === null || group?.kind !== "part") return undefined;
  const waiting = toolsOf(group.part).filter(isAwaitingApproval);
  if (group.part.kind === "tool-trace") return waiting[0];
  const card = element.closest(WAITING);
  if (card === null) return undefined;
  return waiting[[...holder.querySelectorAll(WAITING)].indexOf(card)];
}

/**
 * The ids of the calls up to and including `toolCallId` in the batch that
 * held it in `groups`: the ones the next waiting call does not come from.
 */
function callsThrough(
  groups: readonly PartsGroup[],
  toolCallId: string,
): ReadonlySet<string> {
  const group = placeOf(groups, toolCallId)?.group;
  if (group?.kind !== "part") return new Set();
  const ids = toolsOf(group.part).map((tool) => tool.toolCallId);
  return new Set(ids.slice(0, ids.indexOf(toolCallId) + 1));
}

/**
 * Where focus goes once a call has stopped waiting: in a batch that still
 * has calls waiting, the card of the first one not in `passed` (or else of
 * the first one); otherwise the run it folded into, by its trigger. With no
 * group, the first control in `element`.
 *
 * The card, not its Approve button, as `ToolGroup` does: a held Enter
 * repeats onto whatever has focus, and would decide a call the person never
 * chose. A host's card without the slot gets its first button.
 */
function focusTarget(
  element: Element,
  group: PartsGroup | undefined,
  passed: ReadonlySet<string>,
): HTMLElement | null {
  if (group?.kind === "part" && group.part.kind === "tool-batch") {
    const waiting = group.part.tools.filter(isAwaitingApproval);
    const next = Math.max(
      0,
      waiting.findIndex((tool) => !passed.has(tool.toolCallId)),
    );
    const cards = element.querySelectorAll(WAITING);
    const card = cards[next] ?? cards[0];
    const target =
      card?.querySelector<HTMLElement>("[data-slot='tool-approval-card']") ??
      card?.querySelector<HTMLElement>("button");
    if (target !== null && target !== undefined) return target;
  }
  return element.querySelector<HTMLElement>(
    "[data-slot='activity-trigger'], [data-slot='tool-group-header'], button",
  );
}

/**
 * Where focus goes, inside `root`, once the `leaving` call stopped waiting.
 * A call the host dropped from `parts` hands focus to its group if that
 * still stands (a batch with other calls), else to the group before where
 * it stood, else to the first control in `root`.
 */
function handoffTarget(
  root: Element,
  groups: readonly PartsGroup[],
  leaving: Leaving,
): HTMLElement | null {
  const { toolCallId } = leaving;
  // Taken from where the call last stood, as a dropped call is gone from
  // `groups`.
  const passed = callsThrough(leaving.groups, toolCallId);
  const inGroup = (group: PartsGroup | undefined): HTMLElement | null => {
    // Matched by attribute, not a selector: a key holds a host's call id.
    const element = [...root.children].find(
      (child) => child.getAttribute("data-part-key") === group?.key,
    );
    return element === undefined ? null : focusTarget(element, group, passed);
  };
  const here = placeOf(groups, toolCallId);
  if (here !== undefined) return inGroup(here.group);
  const was = placeOf(leaving.groups, toolCallId);
  const near =
    was === undefined
      ? undefined
      : (groups.find((group) => group.key === was.group.key) ??
        groupAt(groups, was.index - 1));
  return inGroup(near) ?? focusTarget(root, undefined, passed);
}

/** Records a decision on one call: the call, then the person's answer. */
export type MessagePartsDecide = (
  tool: PartTool,
  decision: ToolApprovalDecision,
) => void;

export type MessagePartsProps = Omit<
  ComponentProps<"div">,
  "children" | "ref"
> & {
  /** The message's parts, in order. */
  readonly parts: readonly ConversationPart[];
  /**
   * Whether the message is still arriving: its last run then shows its live
   * line. Defaults to the enclosing `Message`'s `streaming` status.
   */
  readonly streaming?: boolean | undefined;
  /**
   * A person's decision on a call waiting for one. A fast double click can
   * call it twice, so record decisions idempotently by approval id.
   */
  readonly onDecide?: MessagePartsDecide | undefined;
  /** A generated image was chosen; `opener` is where focus should go back to. */
  readonly onOpenImage?:
    | ((part: PartImage, index: number, opener: HTMLElement) => void)
    | undefined;
  /**
   * Renders a text part's text, passed to `MessageContent` as `render`: say,
   * markdown through the host's own renderer and sanitiser. Without it the
   * text is plain. `renderText` takes precedence over it.
   */
  readonly renderMarkdown?: ((text: string) => ReactNode) | undefined;
  /** Renders one step of an opened run. Defaults to `Reasoning`, `Tool` or `ToolGroup`. */
  readonly renderStep?: ActivityContentProps["renderStep"];
  /*
   * The overrides below each replace one kind of part. Each returns what to
   * show, `null` for nothing, or `undefined` to keep the default.
   */
  /**
   * A text part. Defaults to `MessageContent`. Takes precedence over
   * `renderMarkdown`; return `undefined` to fall back to it.
   */
  readonly renderText?: ((part: PartText) => ReactNode) | undefined;
  /**
   * A run of thinking and tool work. Defaults to `Activity`. When a call
   * folds into the run with focus on it, focus moves to the run's first
   * `[data-slot='activity-trigger']` or `<button>`; a run with neither
   * leaves focus on the page.
   */
  readonly renderActivity?:
    | ((
        steps: readonly ActivityStep[],
        state: { readonly streaming: boolean },
      ) => ReactNode)
    | undefined;
  /**
   * A call waiting on a person. Defaults to `ToolApproval`. Use `decide`
   * rather than `onDecide`, so focus is looked after when the call moves.
   * The markup needs nothing for that: the call folds into a run, and focus
   * goes to the run (see `renderActivity`).
   */
  readonly renderApproval?:
    | ((
        part: PartTool,
        decide: (decision: ToolApprovalDecision) => void,
      ) => ReactNode)
    | undefined;
  /**
   * A batch with a call waiting on a person. Defaults to `ToolGroup`. Use
   * `decide` rather than `onDecide`, so focus is looked after when the call
   * moves. The handoff finds the waiting calls by their cards: render each
   * as a `[data-slot='tool-approval'][data-status='pending']` element, in
   * order, with a `<button>` inside (as `ToolApproval` does). Focus then
   * moves to the next card's `[data-slot='tool-approval-card']`, or its
   * first `<button>` without one; once none is left, to the batch's first
   * `[data-slot='tool-group-header']` or `<button>`.
   */
  readonly renderBatch?:
    | ((part: PartToolBatch, decide: MessagePartsDecide) => ReactNode)
    | undefined;
  /**
   * A generative-UI block. Its `data` is the host's to parse, so without
   * this a block shows nothing.
   */
  readonly renderBlock?: ((part: PartBlock) => ReactNode) | undefined;
  /** A run of consecutive file parts. Defaults to `Attachments` tiles. */
  readonly renderFiles?:
    | ((files: readonly PartFile[]) => ReactNode)
    | undefined;
  /** A system line. Defaults to a `ConversationNotice` of its `event`. */
  readonly renderEvent?: ((part: PartEvent) => ReactNode) | undefined;
  /** Generated images. Defaults to `GeneratedImages`. */
  readonly renderImages?: ((part: PartImage) => ReactNode) | undefined;
  /** An answer's sources. Defaults to numbered `Sources`. */
  readonly renderSources?: ((part: PartSources) => ReactNode) | undefined;
};

/**
 * A message's parts, each as its component: runs of thinking and tool work
 * fold into one `Activity` each (`groupActivity`), a call waiting on a person
 * stands out as a `ToolApproval` (or inside its `ToolGroup`), text is a
 * `MessageContent`, files are `Attachments` tiles, images
 * `GeneratedImages`, sources `Sources` and events a `ConversationNotice`.
 * Any kind can be replaced through its `render…` prop. Place it inside a
 * `Message`.
 *
 * Deciding a call folds it into the run before it, so its buttons go away.
 * When that leaves focus on the page, focus moves to the run's trigger, or,
 * in a batch with calls still waiting, to the next one's card. A host's
 * own `renderApproval` or `renderBatch` gets the same through its `decide`.
 * The same happens when a call with focus on its buttons stops waiting with
 * no decision (it timed out or expired). A call the host drops from `parts`
 * hands focus to the run it sat under, or else to the first control here.
 */
export function MessageParts({
  parts,
  streaming: streamingProp,
  onDecide,
  onOpenImage,
  renderMarkdown,
  renderStep,
  renderText,
  renderActivity,
  renderApproval,
  renderBatch,
  renderBlock,
  renderFiles,
  renderEvent,
  renderImages,
  renderSources,
  className,
  onFocus,
  onBlur,
  ...props
}: MessagePartsProps) {
  const message = useMessageContext();
  const streaming = streamingProp ?? message?.status === "streaming";
  const groups = useMemo(() => groupParts(parts), [parts]);
  const root = useRef<HTMLDivElement | null>(null);
  // The call last decided here, until its decision shows in `parts`.
  const decided = useRef<Leaving | null>(null);
  // The waiting call whose card holds focus, while it does.
  const focused = useRef<Leaving | null>(null);

  useLayoutEffect(() => {
    // Each watch ends with its own call, as the two can name different
    // ones: in a batch, focus is on the next card, and watched there, by
    // the time the decided call shows as recorded; and a decision the host
    // never records must not hide a call lapsing under focus later. When
    // both end at once, focus went from the focused call, so the handoff
    // starts there.
    let leaving: Leaving | null = null;
    for (const watch of [focused, decided]) {
      const call = watch.current;
      if (call === null) continue;
      const tool = findTool(parts, call.toolCallId);
      // Still waiting: the host has not recorded it yet, and the buttons
      // are still there.
      if (tool !== undefined && isAwaitingApproval(tool)) continue;
      watch.current = null;
      leaving ??= call;
    }
    if (leaving === null) return;
    const active = document.activeElement;
    if (active !== null && active !== document.body) return;
    if (root.current === null) return;
    handoffTarget(root.current, groups, leaving)?.focus();
  });

  const decide: MessagePartsDecide = (tool, decision) => {
    decided.current = { toolCallId: tool.toolCallId, groups };
    onDecide?.(tool, decision);
  };

  const trackFocus = (event: FocusEvent<HTMLDivElement>) => {
    const tool = waitingCallAt(event.target, groups);
    focused.current =
      tool === undefined ? null : { toolCallId: tool.toolCallId, groups };
    onFocus?.(event);
  };

  const untrackFocus = (event: FocusEvent<HTMLDivElement>) => {
    // Focus leaving for the page or outside ends the watch. A card's
    // buttons going away with its call does not reach here: React ignores
    // blur while it commits, so the watch survives until the effect reads it.
    const next = event.relatedTarget;
    if (next === null || !event.currentTarget.contains(next))
      focused.current = null;
    onBlur?.(event);
  };

  const show = (group: PartsGroup, index: number): ReactNode => {
    switch (group.kind) {
      case "activity": {
        const live = streaming && index === groups.length - 1;
        const custom = renderActivity?.(group.steps, { streaming: live });
        if (custom !== undefined) return custom;
        return (
          <Activity steps={group.steps} streaming={live}>
            {renderStep === undefined ? undefined : (
              <>
                <ActivityTrigger />
                <ActivityContent renderStep={renderStep} />
              </>
            )}
          </Activity>
        );
      }
      case "files": {
        const custom = renderFiles?.(group.files);
        if (custom !== undefined) return custom;
        return (
          <Attachments variant="tiles" total={group.files.length}>
            {group.files.map((file, position) => (
              <Attachment key={`${position}-${file.name}`} data={file}>
                <AttachmentPreview />
                <AttachmentInfo />
              </Attachment>
            ))}
          </Attachments>
        );
      }
      case "part":
        return showPart(group.part);
    }
  };

  const showPart = (part: Exclude<ConversationPart, PartFile>): ReactNode => {
    switch (part.kind) {
      case "text": {
        const custom = renderText?.(part);
        if (custom !== undefined) return custom;
        return <MessageContent text={part.text} render={renderMarkdown} />;
      }
      case "tool-trace": {
        const decideThis = (decision: ToolApprovalDecision) =>
          decide(part, decision);
        const custom = renderApproval?.(part, decideThis);
        if (custom !== undefined) return custom;
        return <ToolApproval part={part} onDecide={decideThis} />;
      }
      case "tool-batch": {
        const custom = renderBatch?.(part, decide);
        if (custom !== undefined) return custom;
        return <ToolGroup part={part} onDecide={decide} />;
      }
      case "block":
        return renderBlock?.(part) ?? null;
      case "event": {
        const custom = renderEvent?.(part);
        if (custom !== undefined) return custom;
        return <ConversationNotice>{part.event}</ConversationNotice>;
      }
      case "image": {
        const custom = renderImages?.(part);
        if (custom !== undefined) return custom;
        return (
          <GeneratedImages
            part={part}
            onOpen={
              onOpenImage === undefined
                ? undefined
                : (index, opener) => onOpenImage(part, index, opener)
            }
          />
        );
      }
      case "sources": {
        const custom = renderSources?.(part);
        if (custom !== undefined) return custom;
        return (
          <Sources>
            {part.sources.map((source, position) => (
              <Source
                key={`${position}-${source.url}`}
                href={source.url}
                index={position + 1}
              >
                {source.title}
              </Source>
            ))}
          </Sources>
        );
      }
      case "reasoning":
        // Unreachable: thinking always folds into a run.
        return null;
    }
  };

  return (
    <div
      ref={root}
      data-slot="message-parts"
      className={cn("flex min-w-0 flex-col gap-3", className)}
      onFocus={trackFocus}
      onBlur={untrackFocus}
      {...props}
    >
      {groups.map((group, index) => (
        // Laid out as its contents; there to find a group's controls by key.
        <div key={group.key} data-part-key={group.key} className="contents">
          {show(group, index)}
        </div>
      ))}
    </div>
  );
}
