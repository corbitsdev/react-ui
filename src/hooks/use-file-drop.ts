import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";

/**
 * What a drop's file-system entry needs to offer. A browser's
 * `FileSystemEntry` fits; so does a plain object, which is how tests stand
 * in for a dropped folder.
 */
export type DroppedEntry = {
  readonly name: string;
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  /** On a file entry. */
  file?(
    success: (file: File) => void,
    failure?: (error: DOMException) => void,
  ): void;
  /** On a folder entry. */
  createReader?(): {
    readEntries(
      success: (entries: DroppedEntry[]) => void,
      failure?: (error: DOMException) => void,
    ): void;
  };
};

/** The parts of a `DataTransfer` a drop is read from. */
export type DropSource = {
  readonly types: readonly string[];
  readonly items?: ArrayLike<{
    readonly kind: string;
    getAsFile(): File | null;
    webkitGetAsEntry(): DroppedEntry | null;
  }>;
  readonly files: ArrayLike<File>;
};

export type DroppedFiles = {
  /** Loose files first, in drop order, then each folder's files depth first. */
  readonly files: readonly File[];
  /** Names of the folders dropped. */
  readonly folders: readonly string[];
  /** A folder held more entries than were read. */
  readonly truncated: boolean;
  /** Entries that could not be read and were skipped. */
  readonly errors: readonly unknown[];
};

export type ReadDroppedFilesOptions = {
  /** Most entries read across every dropped folder. */
  readonly maxFolderEntries?: number;
};

const DEFAULT_MAX_FOLDER_ENTRIES = 500;

/** Whether a drag carries files, as opposed to text or a link. */
function carriesFiles(source: Pick<DropSource, "types"> | null): boolean {
  return source !== null && source.types.includes("Files");
}

function readBatch(
  reader: ReturnType<NonNullable<DroppedEntry["createReader"]>>,
): Promise<DroppedEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

function readFile(entry: DroppedEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    if (entry.file === undefined)
      reject(new Error(`${entry.name} is not a file`));
    else entry.file(resolve, reject);
  });
}

type Walk = { remaining: number; truncated: boolean; errors: unknown[] };

/**
 * A folder's files, depth first, each renamed to its path from the dropped
 * folder ("photos/2024/a.jpg") so files of the same name in different
 * subfolders stay distinct. Hidden entries (`.git`, `.DS_Store`) are skipped.
 *
 * Entries are taken a batch at a time, and no further batch is asked for
 * once the budget is spent, so a huge folder costs a few `readEntries`
 * calls rather than its whole listing.
 */
async function filesInFolder(
  folder: DroppedEntry,
  path: string,
  walk: Walk,
): Promise<File[]> {
  const files: File[] = [];
  if (walk.truncated || folder.createReader === undefined) return files;
  const reader = folder.createReader();
  // `readEntries` hands back a batch at a time until it returns none.
  while (!walk.truncated) {
    let batch: DroppedEntry[];
    try {
      batch = await readBatch(reader);
    } catch (error) {
      walk.errors.push(error);
      break;
    }
    if (batch.length === 0) break;
    for (const entry of batch) {
      if (entry.name.startsWith(".")) continue;
      if (walk.remaining <= 0) {
        walk.truncated = true;
        break;
      }
      walk.remaining -= 1;
      const entryPath = `${path}/${entry.name}`;
      if (entry.isDirectory) {
        files.push(...(await filesInFolder(entry, entryPath, walk)));
        if (walk.truncated) break;
      } else if (entry.isFile) {
        try {
          const file = await readFile(entry);
          // A File made from a File shares its bytes; nothing is copied.
          files.push(
            new File([file], entryPath, {
              type: file.type,
              lastModified: file.lastModified,
            }),
          );
        } catch (error) {
          walk.errors.push(error);
        }
      }
    }
  }
  return files;
}

/**
 * The files in a drop, with every dropped folder walked for the files inside
 * it. A folder shows up in `files` as one unreadable entry, so its entries
 * are read instead; past `maxFolderEntries` the walk stops, folders not yet
 * reached are not listed, and the result is `truncated`. An entry that
 * cannot be read is skipped and kept in `errors`.
 *
 * Call it from the drop handler itself: the browser empties the drop's items
 * once the event is over, so they are taken before anything is awaited.
 */
export function readDroppedFiles(
  source: DropSource,
  {
    maxFolderEntries = DEFAULT_MAX_FOLDER_ENTRIES,
  }: ReadDroppedFilesOptions = {},
): Promise<DroppedFiles> {
  const taken =
    source.items === undefined
      ? Array.from(source.files, (file) => ({ entry: null, file }))
      : Array.from(source.items).flatMap((item) =>
          item.kind === "file"
            ? [{ entry: item.webkitGetAsEntry(), file: item.getAsFile() }]
            : [],
        );
  return (async () => {
    const loose: File[] = [];
    const nested: File[] = [];
    const folders: string[] = [];
    const walk: Walk = {
      remaining: maxFolderEntries,
      truncated: false,
      errors: [],
    };
    for (const { entry, file } of taken) {
      if (entry !== null && entry.isDirectory) {
        folders.push(entry.name);
        nested.push(...(await filesInFolder(entry, entry.name, walk)));
      } else if (file !== null) {
        loose.push(file);
      }
    }
    return {
      files: [...loose, ...nested],
      folders,
      truncated: walk.truncated,
      errors: walk.errors,
    };
  })();
}

let strayDropGuards = 0;

function guardStrayDrop(event: DragEvent) {
  // A drop target already took it, or there are no files to open.
  if (event.defaultPrevented || !carriesFiles(event.dataTransfer)) return;
  // A native file input takes files by its default action.
  const target = event.target;
  if (target instanceof HTMLInputElement && target.type === "file") return;
  event.preventDefault();
  if (event.dataTransfer !== null) event.dataTransfer.dropEffect = "none";
}

/**
 * Stops files dropped outside every drop target from opening in the tab and
 * leaving the page. While any component using it is mounted, a file drag
 * over the rest of the page shows the no-drop cursor and its drop does
 * nothing. Drops onto drop targets, native file inputs and anything that
 * handles its own drop (calls `preventDefault`) are untouched; a
 * `contenteditable` that relies on the browser's own image drop does not get
 * it while the guard is on.
 *
 * However many components use it, the window gets one pair of listeners.
 */
export function usePreventStrayDrops(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    if (strayDropGuards === 0) {
      window.addEventListener("dragover", guardStrayDrop);
      window.addEventListener("drop", guardStrayDrop);
    }
    strayDropGuards += 1;
    return () => {
      strayDropGuards -= 1;
      if (strayDropGuards === 0) {
        window.removeEventListener("dragover", guardStrayDrop);
        window.removeEventListener("drop", guardStrayDrop);
      }
    };
  }, [enabled]);
}

export type FileDropDetails = Omit<DroppedFiles, "files">;

export type UseFileDropOptions = ReadDroppedFilesOptions & {
  /**
   * Called once a drop has been read, with its files (folders walked) and
   * what it held. A drop of only empty folders calls it with no files.
   */
  readonly onFiles: (files: readonly File[], details: FileDropDetails) => void;
  /**
   * While true, drags are ignored and the browser's default stands. A drop
   * still being read when it turns true is dropped, errors and all.
   */
  readonly disabled?: boolean;
  /**
   * Called when a drop could not be read in full: a folder that could not
   * be listed or a file that could not be opened. The rest of the drop
   * still reaches `onFiles`. Without it, errors go to `reportError`.
   */
  readonly onError?: (error: unknown) => void;
};

export type FileDropTargetProps<T extends Element> = {
  readonly onDragEnter: (event: ReactDragEvent<T>) => void;
  readonly onDragOver: (event: ReactDragEvent<T>) => void;
  readonly onDragLeave: (event: ReactDragEvent<T>) => void;
  /** In the capture phase, so the target reads a drop before its children. */
  readonly onDropCapture: (event: ReactDragEvent<T>) => void;
};

export type UseFileDropResult<T extends Element> = {
  /** Whether files are being held over the target. */
  readonly over: boolean;
  /** Spread onto the drop target. */
  readonly dropProps: FileDropTargetProps<T>;
};

function report(error: unknown) {
  if (typeof globalThis.reportError === "function")
    globalThis.reportError(error);
  else console.error(error);
}

/**
 * Makes an element a target for dropped files and folders. Only drags that
 * carry files are taken; text and links dragged over it behave as usual.
 * Every file drop inside the target is the target's: it reads the drop in
 * the capture phase, before any child, and marks it taken with
 * `preventDefault`, so a folder dropped on a child is walked like one
 * dropped anywhere else. A child that takes drops of its own skips one
 * already taken, as `FileInput` does. A drop still being read when the
 * target unmounts is dropped.
 *
 * `over` is true while files are held over the target, including over its
 * children. It turns false when the drag leaves the target, is dropped, or
 * ends anywhere on the page.
 *
 * Pair it with `usePreventStrayDrops` so a drop that misses the target does
 * not open the file in place of the page; `AttachmentDropZone` does both.
 */
export function useFileDrop<T extends Element = HTMLElement>({
  onFiles,
  disabled = false,
  maxFolderEntries,
  onError,
}: UseFileDropOptions): UseFileDropResult<T> {
  const [over, setOver] = useState(false);
  // The latest options, for a drop still being read under an earlier render.
  const latest = useRef({ onFiles, onError, maxFolderEntries, disabled });
  useLayoutEffect(() => {
    latest.current = { onFiles, onError, maxFolderEntries, disabled };
  });
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // Counted rather than read from `relatedTarget`, which WebKit leaves null:
  // moving between two children enters one before leaving the other, so the
  // count only reaches zero once the drag has left the target.
  const depth = useRef(0);
  const entered = useRef<Event | null>(null);

  useEffect(() => {
    if (!over) return;
    const reset = () => {
      depth.current = 0;
      setOver(false);
    };
    // A drag dropped elsewhere or ended never comes back to this target. A
    // count thrown off (a child removed from under the pointer takes its
    // leave with it) is put right by the next enter outside the target: one
    // that did not pass through `onDragEnter` on its way up.
    const enteredElsewhere = (event: DragEvent) => {
      if (event !== entered.current) reset();
    };
    window.addEventListener("dragend", reset);
    window.addEventListener("drop", reset);
    document.addEventListener("dragenter", enteredElsewhere);
    return () => {
      window.removeEventListener("dragend", reset);
      window.removeEventListener("drop", reset);
      document.removeEventListener("dragenter", enteredElsewhere);
    };
  }, [over]);

  useEffect(() => {
    if (!disabled) return;
    depth.current = 0;
    setOver(false);
  }, [disabled]);

  const takes = (event: ReactDragEvent<T>) =>
    !disabled && carriesFiles(event.dataTransfer);

  return {
    over: over && !disabled,
    dropProps: {
      onDragEnter: (event) => {
        if (!takes(event)) return;
        event.preventDefault();
        entered.current = event.nativeEvent;
        depth.current += 1;
        setOver(true);
      },
      onDragOver: (event) => {
        if (!takes(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        // Over the target after a reset, its enter long gone.
        if (depth.current === 0) depth.current = 1;
        setOver(true);
      },
      onDragLeave: (event) => {
        if (!takes(event)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      },
      onDropCapture: (event) => {
        if (!takes(event)) return;
        depth.current = 0;
        setOver(false);
        // A target around this one took it first.
        if (event.isDefaultPrevented()) return;
        event.preventDefault();
        const options = latest.current.maxFolderEntries;
        // Disabled or unmounted while the drop was being read.
        const stale = () => latest.current.disabled || !mounted.current;
        readDroppedFiles(
          event.dataTransfer,
          options === undefined ? {} : { maxFolderEntries: options },
        ).then(
          ({ files, ...details }) => {
            if (stale()) return;
            const { onFiles: deliver, onError: fail } = latest.current;
            for (const error of details.errors) (fail ?? report)(error);
            if (files.length > 0 || details.folders.length > 0) {
              deliver(files, details);
            }
          },
          (error: unknown) => {
            if (!stale()) (latest.current.onError ?? report)(error);
          },
        );
      },
    },
  };
}
