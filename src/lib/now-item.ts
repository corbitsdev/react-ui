/**
 * The model behind the "Now" surface: the things asking for the user's
 * attention, whatever produced them.
 *
 * Two variants, because they behave differently and not because they look
 * different: a `gate` is blocked work that cannot proceed without a decision,
 * and a `mail` is something delivered to be read. A gate is never "read"; a
 * mail has no decision to make. A single optional-field shape would let a
 * caller build a read gate, which is not a thing.
 *
 * `classification` is a free string, not an enum: what counts as a category
 * differs per app, and the label is shown verbatim. Ranking is driven by
 * `priority`, which is fixed, so a new classification never changes ordering.
 */

export type NowPriority = "now" | "next" | "later";

export type NowStatus = "needs-action" | "done";

type NowItemBase = {
  readonly id: string;
  readonly title: string;
  readonly summary?: string;
  /** Category shown as a badge, e.g. "Approval", "Brief", "Failure". */
  readonly classification: string;
  readonly priority: NowPriority;
  /**
   * Whether the item is still asking for something. On the base and not only on
   * mail: a gate is resolved once decided, exactly as a message is once handled,
   * and a row that had to check `type` before it could show "done" would be
   * wrong the first time a third variant appeared.
   */
  readonly status: NowStatus;
  /** ISO timestamp. Ties in priority are broken by this, newest first. */
  readonly when: string;
  /** Where the item opens. Without it the card renders as static text. */
  readonly href?: string;
};

export type NowItem =
  | (NowItemBase & {
      readonly type: "gate";
      /** The decision being asked for, e.g. "Approve send". */
      readonly action: string;
    })
  | (NowItemBase & {
      readonly type: "mail";
      readonly from: string;
      readonly read: boolean;
    });

const PRIORITY_RANK: Record<NowPriority, number> = { now: 0, next: 1, later: 2 };

/** Short band label for the queue's priority column. */
export const PRIORITY_LABEL: Record<NowPriority, string> = { now: "HIGH", next: "MED", later: "LOW" };

/** Human label for the status marker. */
export const STATUS_LABEL: Record<NowStatus, string> = { "needs-action": "Needs action", done: "Done" };

/**
 * Priority first, then newest. Sorts a copy — a component handed a frozen or
 * host-owned array must not reorder it in place.
 */
export function sortNowItems(items: readonly NowItem[]): readonly NowItem[] {
  return [...items].sort((a, b) => {
    const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (byPriority !== 0) return byPriority;
    return Date.parse(b.when) - Date.parse(a.when);
  });
}

export type NowGroup = {
  readonly priority: NowPriority;
  readonly items: readonly NowItem[];
};

/**
 * Sorted items split into priority bands. Empty bands are dropped rather than
 * returned empty, so a caller can map straight to headings without checking.
 */
export function groupNowItemsByPriority(items: readonly NowItem[]): readonly NowGroup[] {
  const sorted = sortNowItems(items);
  const order: readonly NowPriority[] = ["now", "next", "later"];
  return order
    .map((priority) => ({ priority, items: sorted.filter((item) => item.priority === priority) }))
    .filter((group) => group.items.length > 0);
}

/** The classifications present, in first-appearance order — for a filter row. */
export function nowItemClassifications(items: readonly NowItem[]): readonly string[] {
  return [...new Set(sortNowItems(items).map((item) => item.classification))];
}
