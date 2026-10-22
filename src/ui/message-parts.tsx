"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ComponentProps, ReactNode } from "react";

import {
  groupActivity,
  isAwaitingApproval,
  type ActivityStep,
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
      groups.push({ kind: "part", key: group.key, part: group.part });
  }
  return groups;
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

const WAITING = "[data-slot='tool-approval'][data-status='pending']";

/**
 * Where focus goes once a decided call has moved: in a batch that still has
 * calls waiting, the next one after it (or the first); otherwise the run it
 * folded into, by its trigger.
 */
function focusTarget(
  element: Element,
  group: PartsGroup,
  toolCallId: string,
): HTMLElement | null {
  if (group.kind === "part" && group.part.kind === "tool-batch") {
    const { tools } = group.part;
    const decided = tools.findIndex((tool) => tool.toolCallId === toolCallId);
    const waiting = tools.flatMap((tool, index) =>
      isAwaitingApproval(tool) ? [index] : [],
    );
    const next = Math.max(
      0,
      waiting.findIndex((index) => index > decided),
    );
    const cards = element.querySelectorAll(WAITING);
    const card = cards[next] ?? cards[0];
    const button = card?.querySelector<HTMLElement>("button");
    if (button !== null && button !== undefined) return button;
  }
  return element.querySelector<HTMLElement>(
    "[data-slot='activity-trigger'], [data-slot='tool-group-header'], button",
  );
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
   * text is plain.
   */
  readonly renderMarkdown?: ((text: string) => ReactNode) | undefined;
  /** Renders one step of an opened run. Defaults to `Reasoning`, `Tool` or `ToolGroup`. */
  readonly renderStep?: ActivityContentProps["renderStep"];
  /*
   * The overrides below each replace one kind of part. Each returns what to
   * show, `null` for nothing, or `undefined` to keep the default.
   */
  /** A text part. Defaults to `MessageContent`. */
  readonly renderText?: ((part: PartText) => ReactNode) | undefined;
  /** A run of thinking and tool work. Defaults to `Activity`. */
  readonly renderActivity?:
    | ((
        steps: readonly ActivityStep[],
        state: { readonly streaming: boolean },
      ) => ReactNode)
    | undefined;
  /**
   * A call waiting on a person. Defaults to `ToolApproval`. Use `decide`
   * rather than `onDecide`, so focus is looked after when the call moves.
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
   * moves.
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
 * in a batch with calls still waiting, to the next one's buttons. A host's
 * own `renderApproval` or `renderBatch` gets the same through its `decide`.
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
  ...props
}: MessagePartsProps) {
  const message = useMessageContext();
  const streaming = streamingProp ?? message?.status === "streaming";
  const groups = useMemo(() => groupParts(parts), [parts]);
  const root = useRef<HTMLDivElement | null>(null);
  // The call last decided here, until its decision shows in `parts`.
  const decided = useRef<string | null>(null);

  useLayoutEffect(() => {
    const toolCallId = decided.current;
    if (toolCallId === null) return;
    const tool = findTool(parts, toolCallId);
    // The host has not recorded it yet; the buttons are still there.
    if (tool !== undefined && isAwaitingApproval(tool)) return;
    decided.current = null;
    const active = document.activeElement;
    if (active !== null && active !== document.body) return;
    const group = groups.find((candidate) =>
      partsIn(candidate).some((part) =>
        toolsOf(part).some((held) => held.toolCallId === toolCallId),
      ),
    );
    const element =
      group === undefined
        ? null
        : root.current?.querySelector(`[data-part-key='${group.key}']`);
    if (group === undefined || element === null || element === undefined)
      return;
    focusTarget(element, group, toolCallId)?.focus();
  });

  const decide: MessagePartsDecide = (tool, decision) => {
    decided.current = tool.toolCallId;
    onDecide?.(tool, decision);
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
                : (image, opener) => onOpenImage(part, image, opener)
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
