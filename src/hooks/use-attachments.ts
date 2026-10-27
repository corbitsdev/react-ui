import { useCallback, useEffect, useRef } from "react";

import {
  checkAttachments,
  type AttachmentLimits,
  type AttachmentRejection,
} from "../lib/attachment-limits.js";

/** A file waiting to be sent, as the host holds it. */
export type AttachmentItem = {
  readonly id: string;
  readonly name: string;
  readonly mediaType: string;
  /** In bytes. */
  readonly size: number;
  /** Where the bytes are: a preview URL `useAttachments` made, or the host's own. */
  readonly url?: string;
  /** The local file, for the host to upload or send. */
  readonly file?: File;
};

export type UseAttachmentsOptions = AttachmentLimits & {
  /** The attachments the host holds now. */
  readonly attachments: readonly AttachmentItem[];
};

export type AttachmentIntake = {
  /** New attachments, each with a preview URL, to append to the host's list. */
  readonly accepted: readonly AttachmentItem[];
  /** Files left out, each with why. */
  readonly rejected: readonly AttachmentRejection<File>[];
};

export type UseAttachmentsResult = {
  /** Checks `files` against the limits and the attachments already held. */
  readonly add: (files: Iterable<File> | ArrayLike<File>) => AttachmentIntake;
  /**
   * Hands the preview URLs of `ids` over to the host: the hook stops
   * tracking them and never revokes them. Call it before moving attachments
   * out of the list somewhere they are still shown, such as a sent message;
   * revoking them is then the host's job.
   */
  readonly release: (ids: Iterable<string>) => void;
};

let lastAttachmentId = 0;

function nextAttachmentId(): string {
  lastAttachmentId += 1;
  return `attachment-${lastAttachmentId}`;
}

/**
 * Takes files into a host-owned attachment list.
 *
 * `add` runs `checkAttachments` against the list (and anything it accepted
 * since the list last changed, so two drops in one tick cannot both slip
 * past a limit) and gives each accepted file an object URL for its preview.
 * The host appends `accepted` to its list in the same update and decides
 * what to say about `rejected`.
 *
 * Every URL the hook makes is revoked at the first commit whose list does
 * not hold its attachment: once the host removes it, however it does, or
 * right away if the host never appended it. The rest go when the hook
 * unmounts. Only
 * URLs the hook made are revoked; the host's own are left alone. To keep an
 * attachment on screen after it leaves the list (sending moves it into a
 * message), `release` it first.
 *
 * The unmount revoke waits a microtask and is called off if the hook mounts
 * again, which is what StrictMode's simulated remount does within one
 * commit. A hook hidden by `<Activity mode="hidden">` for longer than that
 * counts as unmounted: its previews are revoked, and once it shows again
 * the attachments still held keep URLs that no longer load. `Attachment`
 * rebuilds their pictures from `file`. Anything else that reads `url`
 * after such a hide, such as a viewer opened from `AttachmentPreview`'s
 * `onOpen`, should make its own URL from `file`, or the hook should sit
 * above the `Activity`.
 */
export function useAttachments({
  attachments,
  maxFiles,
  maxFileBytes,
}: UseAttachmentsOptions): UseAttachmentsResult {
  const urls = useRef(new Map<string, string>());
  const pending = useRef<AttachmentItem[]>([]);
  const latest = useRef({ attachments, maxFiles, maxFileBytes });
  latest.current = { attachments, maxFiles, maxFileBytes };
  const mounted = useRef(false);

  // After every commit, not only when the list changes: an accepted file the
  // host did not append must neither keep its URL nor count as a duplicate
  // of the same file dropped again.
  useEffect(() => {
    pending.current = [];
    const held = new Set(attachments.map((item) => item.id));
    for (const [id, url] of urls.current) {
      if (held.has(id)) continue;
      URL.revokeObjectURL(url);
      urls.current.delete(id);
    }
  });

  useEffect(() => {
    mounted.current = true;
    const owned = urls.current;
    return () => {
      mounted.current = false;
      queueMicrotask(() => {
        if (mounted.current) return;
        for (const url of owned.values()) URL.revokeObjectURL(url);
        owned.clear();
      });
    };
  }, []);

  const add = useCallback((files: Iterable<File> | ArrayLike<File>) => {
    const {
      attachments: held,
      maxFiles: max,
      maxFileBytes: maxBytes,
    } = latest.current;
    const limits: AttachmentLimits = {
      ...(max === undefined ? {} : { maxFiles: max }),
      ...(maxBytes === undefined ? {} : { maxFileBytes: maxBytes }),
    };
    const { accepted, rejected } = checkAttachments(
      [...held, ...pending.current],
      Array.from(files),
      limits,
    );
    const items = accepted.map((file): AttachmentItem => {
      const id = nextAttachmentId();
      const url = URL.createObjectURL(file);
      urls.current.set(id, url);
      return {
        id,
        name: file.name === "" ? "Untitled" : file.name,
        mediaType: file.type === "" ? "application/octet-stream" : file.type,
        size: file.size,
        url,
        file,
      };
    });
    pending.current = [...pending.current, ...items];
    return { accepted: items, rejected };
  }, []);

  const release = useCallback((ids: Iterable<string>) => {
    for (const id of ids) urls.current.delete(id);
  }, []);

  return { add, release };
}
