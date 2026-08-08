import { useMemo, useState } from "react";

import { generativeBlockId, type GenerativeBlock } from "../lib/generative-block.js";

export type UseRenderRailResult = {
  /** The block mirrored into the rail: the pinned block if one is pinned, otherwise the latest. */
  readonly activeBlock: GenerativeBlock | null;
  readonly pinnedId: string | null;
  readonly isPinned: boolean;
  readonly pin: (id: string) => void;
  readonly unpin: () => void;
  /** Pins `id` if nothing else is pinned yet, otherwise unpins — the toggle a corner button wants. */
  readonly togglePin: (id: string) => void;
};

/**
 * "Latest wins unless pinned": the render rail always shows the most recent
 * generative block that appeared in the transcript, except once the reader
 * pins one — then that block stays put no matter what the agent produces
 * next, until they unpin it.
 *
 * `blocks` is the full ordered list from the transcript, newest last, the
 * same shape every generative block already renders inline with. The hook
 * derives the active block from it rather than being handed one directly, so
 * "latest" never drifts out of sync with what is actually on screen.
 */
export function useRenderRail(blocks: readonly GenerativeBlock[]): UseRenderRailResult {
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const latest = blocks.length > 0 ? blocks[blocks.length - 1] : undefined;
  const pinned = pinnedId === null ? undefined : blocks.find((block) => generativeBlockId(block) === pinnedId);

  const activeBlock = useMemo(() => pinned ?? latest ?? null, [pinned, latest]);

  return {
    activeBlock,
    pinnedId,
    isPinned: pinnedId !== null,
    pin: (id: string) => setPinnedId(id),
    unpin: () => setPinnedId(null),
    togglePin: (id: string) => setPinnedId((current) => (current === id ? null : id)),
  };
}
