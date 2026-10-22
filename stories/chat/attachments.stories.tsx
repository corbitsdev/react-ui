import { useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";

import {
  useAttachments,
  type AttachmentItem,
} from "../../src/hooks/use-attachments.js";
import type { AttachmentRejection } from "../../src/lib/attachment-limits.js";
import type { PartFile } from "../../src/lib/conversation.js";
import { AttachmentDropZone } from "../../src/ui/attachment-drop-zone.js";
import {
  Attachment,
  AttachmentInfo,
  AttachmentMore,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
  type AttachmentData,
  type AttachmentsVariant,
} from "../../src/ui/attachments.js";
import { Button } from "../../src/ui/button.js";
import { FileInput } from "../../src/ui/file-input.js";
import { Textarea } from "../../src/ui/textarea.js";
import { generatedImages, shortChat } from "./samples/conversations.js";

export default { title: "Chat / Attachments" };

/** The sample conversations' pictures, as files someone attached. */
const PICTURES = generatedImages.messages
  .flatMap((message) => message.parts)
  .flatMap((part) => (part.kind === "image" ? part.images : []))
  .map((image) => ({
    name: `${image.id}.svg`,
    mediaType: image.mediaType,
    url:
      "url" in image
        ? image.url
        : `data:${image.mediaType};base64,${image.base64}`,
  }));

const DOCUMENTS: readonly Omit<AttachmentData, "size">[] = [
  { name: "quarter-plan.pdf", mediaType: "application/pdf" },
  { name: "runs-this-week.csv", mediaType: "text/csv" },
  { name: "handler.ts", mediaType: "" },
  { name: "standup.m4a", mediaType: "audio/mp4" },
  { name: "screen-recording.mov", mediaType: "video/quicktime" },
  { name: "release-notes-for-the-spring-workflow-update.md", mediaType: "" },
  { name: "exports.zip", mediaType: "application/zip" },
];

/** `count` files: pictures and documents taking turns, each a little bigger. */
function files(count: number): readonly AttachmentItem[] {
  return Array.from({ length: count }, (_, index) => {
    const pool: readonly Omit<AttachmentData, "size">[] =
      index % 2 === 0 ? PICTURES : DOCUMENTS;
    const source = pool[Math.floor(index / 2) % pool.length];
    if (source === undefined) throw new Error("no sample file");
    const round = Math.floor(index / (2 * pool.length));
    return {
      ...source,
      id: `file-${index}`,
      name:
        round === 0 ? source.name : source.name.replace(".", `-${round + 1}.`),
      size: 1200 + index * 48_311,
    };
  });
}

const FOLDED: Record<AttachmentsVariant, number> = {
  stack: 5,
  tiles: 6,
  list: 5,
};

/**
 * Attachments as a host renders them: removable, folded past a few, with
 * "Show less" and "Remove all" once expanded, and "Reset" to bring the files
 * back. Opening reports which file.
 *
 * Nothing it removes takes focus with it: the last attachment and "Remove
 * all" hand focus to `returnFocusTo` (or "Reset"), and "Show less" to "+N".
 */
function Host({
  variant,
  initial,
  returnFocusTo,
}: {
  readonly variant: AttachmentsVariant;
  readonly initial: readonly AttachmentData[];
  /** The message box, when there is one. */
  readonly returnFocusTo?: RefObject<HTMLElement | null>;
}) {
  const fresh = () =>
    initial.map((data, index) => ({ id: `item-${index}`, data }));
  const [items, setItems] = useState(fresh);
  const [expanded, setExpanded] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);
  const reset = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const more = useRef<HTMLButtonElement>(null);
  const fallback = returnFocusTo ?? reset;
  const limit = FOLDED[variant];
  const folded = !expanded && items.length > limit;
  const shown = folded ? items.slice(0, limit - 1) : items;
  const removable = variant !== "tiles";

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments.</p>
      ) : (
        <Attachments
          ref={list}
          variant={variant}
          total={items.length}
          expanded={expanded}
          onExpandedChange={setExpanded}
          returnFocusTo={fallback}
        >
          {shown.map(({ id, data }) => (
            <Attachment key={id} data={data}>
              <AttachmentPreview onOpen={(file) => setOpened(file.name)} />
              <AttachmentInfo />
              {removable ? (
                <AttachmentRemove
                  onClick={() =>
                    setItems((previous) =>
                      previous.filter((item) => item.id !== id),
                    )
                  }
                />
              ) : null}
            </Attachment>
          ))}
          {folded ? (
            <AttachmentMore ref={more} count={items.length - shown.length} />
          ) : null}
        </Attachments>
      )}
      {expanded || removable ? (
        <div className="flex gap-2">
          {expanded ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                flushSync(() => setExpanded(false));
                (more.current ?? list.current)?.focus();
              }}
            >
              Show less
            </Button>
          ) : null}
          {expanded && removable ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fallback.current?.focus();
                setExpanded(false);
                setItems([]);
              }}
            >
              Remove all
            </Button>
          ) : null}
          {removable ? (
            <Button
              ref={reset}
              variant="outline"
              size="sm"
              onClick={() => {
                setExpanded(false);
                setItems(fresh());
              }}
            >
              Reset
            </Button>
          ) : null}
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Opened: <output aria-label="Opened file">{opened ?? "nothing"}</output>
      </p>
    </div>
  );
}

/** The stack sits above the message box, with room for it to lift. */
function AboveInput({ count }: { readonly count: number }) {
  const message = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="flex max-w-xl flex-col gap-2 pt-24">
      <Host variant="stack" initial={files(count)} returnFocusTo={message} />
      <Textarea
        ref={message}
        aria-label="Message"
        placeholder="Ask anything…"
        rows={2}
      />
    </div>
  );
}

export const StackOne = () => <AboveInput count={1} />;
export const StackFive = () => <AboveInput count={5} />;
/** Folds to four cards and "+21"; point at it or tab in to fan it out. */
export const StackTwentyFive = () => <AboveInput count={25} />;

export const TilesOne = () => <Host variant="tiles" initial={files(1)} />;
export const TilesFive = () => <Host variant="tiles" initial={files(5)} />;
export const TilesTwentyFive = () => (
  <Host variant="tiles" initial={files(25)} />
);

/** A sent message's files carry no size; the tiles go without it. */
export const TilesFromMessage = () => (
  <Host
    variant="tiles"
    initial={shortChat.messages
      .flatMap((message) => message.parts)
      .filter((part): part is PartFile => part.kind === "file")}
  />
);

export const ListOne = () => (
  <div className="max-w-md">
    <Host variant="list" initial={files(1)} />
  </div>
);
export const ListFive = () => (
  <div className="max-w-md">
    <Host variant="list" initial={files(5)} />
  </div>
);
export const ListTwentyFive = () => (
  <div className="max-w-md">
    <Host variant="list" initial={files(25)} />
  </div>
);

function refusal({ file, reason }: AttachmentRejection<File>): string {
  switch (reason) {
    case "too-large":
      return `${file.name} is over 5 MB`;
    case "duplicate":
      return `${file.name} is already attached`;
    case "too-many":
      return `${file.name} is past the limit of 20`;
  }
}

/**
 * Drop files or folders anywhere on the box, or choose them. Up to 20 files
 * of 5 MB each; anything refused is said why.
 */
export const DropZone = () => {
  const [attachments, setAttachments] = useState<readonly AttachmentItem[]>([]);
  const [notice, setNotice] = useState("");
  const picker = useRef<HTMLInputElement>(null);
  const { add } = useAttachments({
    attachments,
    maxFiles: 20,
    maxFileBytes: 5 * 1024 * 1024,
  });
  const take = (incoming: Iterable<File> | ArrayLike<File>) => {
    const { accepted, rejected } = add(incoming);
    setAttachments((previous) => [...previous, ...accepted]);
    setNotice(rejected.map(refusal).join("; "));
  };

  return (
    <AttachmentDropZone
      onFiles={(dropped, { folders }) => {
        if (dropped.length === 0 && folders.length > 0) {
          setNotice(`${folders.join(", ")} has no files to add`);
        } else {
          take(dropped);
        }
      }}
      className="flex max-w-xl flex-col gap-3 rounded-lg border border-border p-4 pt-24"
    >
      {attachments.length === 0 ? null : (
        <Attachments
          variant="stack"
          total={attachments.length}
          returnFocusTo={picker}
        >
          {attachments.map((item) => (
            <Attachment key={item.id} data={item}>
              <AttachmentPreview />
              <AttachmentInfo />
              <AttachmentRemove
                onClick={() =>
                  setAttachments((previous) =>
                    previous.filter((held) => held.id !== item.id),
                  )
                }
              />
            </Attachment>
          ))}
        </Attachments>
      )}
      <FileInput
        ref={picker}
        multiple
        onFiles={take}
        hint="or drop files and folders anywhere here"
      />
      <p role="status" className="min-h-5 text-sm text-muted-foreground">
        {notice}
      </p>
    </AttachmentDropZone>
  );
};
