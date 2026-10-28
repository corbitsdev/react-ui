/** What an attachment check needs to know about a file. `File` satisfies it. */
export type AttachmentCandidate = {
  readonly name: string;
  readonly size: number;
};

/** An absent limit does not apply. */
export type AttachmentLimits = {
  /** Most files held at once, counting those already attached. */
  readonly maxFiles?: number;
  /** Largest single file, in bytes. */
  readonly maxFileBytes?: number;
};

export type AttachmentRejectionReason = "too-many" | "too-large" | "duplicate";

export type AttachmentRejection<T extends AttachmentCandidate> = {
  readonly file: T;
  readonly reason: AttachmentRejectionReason;
};

export type AttachmentCheck<T extends AttachmentCandidate> = {
  readonly accepted: readonly T[];
  readonly rejected: readonly AttachmentRejection<T>[];
};

function identity(file: AttachmentCandidate): string {
  return `${file.size}\u0000${file.name}`;
}

/**
 * Which of `incoming` may join the `current` attachments. Each file is checked
 * in turn: too large, then already attached (same name and size, against
 * `current` and the files accepted before it), then past the count limit.
 * Both lists keep the order `incoming` arrived in.
 */
export function checkAttachments<T extends AttachmentCandidate>(
  current: readonly AttachmentCandidate[],
  incoming: readonly T[],
  limits: AttachmentLimits,
): AttachmentCheck<T> {
  const seen = new Set(current.map(identity));
  const room =
    limits.maxFiles === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(0, limits.maxFiles - current.length);
  const accepted: T[] = [];
  const rejected: AttachmentRejection<T>[] = [];

  for (const file of incoming) {
    const key = identity(file);
    if (limits.maxFileBytes !== undefined && file.size > limits.maxFileBytes) {
      rejected.push({ file, reason: "too-large" });
    } else if (seen.has(key)) {
      rejected.push({ file, reason: "duplicate" });
    } else if (accepted.length >= room) {
      rejected.push({ file, reason: "too-many" });
    } else {
      seen.add(key);
      accepted.push(file);
    }
  }

  return { accepted, rejected };
}
