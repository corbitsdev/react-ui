/**
 * Where a reader is in a conversation, worked out from which items are on
 * screen and where turns start. Pure: `useReadingPosition` measures, this
 * decides.
 *
 * A turn is named by the item that starts it and spans every item up to the
 * next turn's start, in document order.
 */

export type MeasuredReadingPosition = {
  /** The turn crossing the reading line, or `null` with nothing on screen. */
  readonly lineId: string | null;
  /** Turns with any item on screen, in document order. */
  readonly visibleIds: readonly string[];
};

export type ReadingPositionInput = {
  /** Registered item ids in document order. */
  readonly ids: readonly string[];
  /** Ids of the items that start a turn; `null` makes every item a turn. */
  readonly turnIds: ReadonlySet<string> | null;
  /** Item ids intersecting the view. */
  readonly visible: ReadonlySet<string>;
  /** The top of a turn's first item, in the same space as `line`. */
  readonly turnTop: (id: string) => number | undefined;
  /** The reading line: a third of the way down the view. */
  readonly line: number;
};

/**
 * The turns on screen, and the one being read: the last on-screen turn whose
 * start has crossed the reading line, or the first on screen when none has.
 * Items before the first turn's start belong to no turn.
 */
export function readingPosition({
  ids,
  turnIds,
  visible,
  turnTop,
  line,
}: ReadingPositionInput): MeasuredReadingPosition {
  const visibleIds: string[] = [];
  let turn: string | null = null;
  for (const id of ids) {
    if (turnIds === null || turnIds.has(id)) turn = id;
    if (turn === null || !visible.has(id) || visibleIds.at(-1) === turn) {
      continue;
    }
    visibleIds.push(turn);
  }
  let lineId: string | null = null;
  for (const id of visibleIds) {
    const top = turnTop(id);
    if (top !== undefined && top <= line) lineId = id;
  }
  return { lineId: lineId ?? visibleIds[0] ?? null, visibleIds };
}

/**
 * The current turn. A turn just jumped to stays current until the reader
 * moves on, even where the view could not bring it to the top (near the
 * end). Otherwise, at the end of the content the last turn on screen is
 * current, since a short last turn may never reach the reading line.
 */
export function currentTurn(
  position: MeasuredReadingPosition & { readonly pinnedId: string | null },
  atEnd: boolean,
): string | null {
  if (position.pinnedId !== null) return position.pinnedId;
  if (atEnd) return position.visibleIds.at(-1) ?? position.lineId;
  return position.lineId;
}

export function samePosition(
  a: MeasuredReadingPosition,
  b: MeasuredReadingPosition,
): boolean {
  return (
    a.lineId === b.lineId &&
    a.visibleIds.length === b.visibleIds.length &&
    a.visibleIds.every((id, index) => id === b.visibleIds[index])
  );
}
