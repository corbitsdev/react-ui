import { useEffect, useMemo, useRef, useState } from "react";

import { generativeBlockId, type GenerativeBlock } from "../lib/generative-block.js";

export type UseRenderRailResult = {
  /** The block mirrored into the rail: the pinned block if one is pinned, otherwise the latest. */
  readonly activeBlock: GenerativeBlock | null;
  readonly pinnedId: string | null;
  readonly isPinned: boolean;
  /** True once a block newer than the pinned one has arrived — the rail's "newer result" affordance reads this. */
  readonly hasNewerBlock: boolean;
  readonly pin: (id: string) => void;
  readonly unpin: () => void;
  /** Pins `id` if nothing else is pinned yet, otherwise unpins — the toggle a corner button wants. */
  readonly togglePin: (id: string) => void;
  /** Drops the pin so the rail follows latest again — what the "newer result" affordance calls. */
  readonly jumpToLatest: () => void;
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
 *
 * While pinned, a block arriving behind the scenes doesn't yank the reader
 * off what they pinned — instead `hasNewerBlock` flips true so the rail can
 * surface a "newer result" affordance, and `jumpToLatest` is the one gesture
 * that clears it.
 */
export function useRenderRail(blocks: readonly GenerativeBlock[]): UseRenderRailResult {
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [hasNewerBlock, setHasNewerBlock] = useState(false);

  const latest = blocks.length > 0 ? blocks[blocks.length - 1] : undefined;
  const latestId = latest ? generativeBlockId(latest) : null;
  const pinned = pinnedId === null ? undefined : blocks.find((block) => generativeBlockId(block) === pinnedId);

  const activeBlock = useMemo(() => pinned ?? latest ?? null, [pinned, latest]);

  const seenLatestIdRef = useRef<string | null>(latestId);
  useEffect(() => {
    if (latestId === seenLatestIdRef.current) return;
    seenLatestIdRef.current = latestId;
    if (pinnedId !== null && pinnedId !== latestId) setHasNewerBlock(true);
  }, [latestId, pinnedId]);

  const pin = (id: string) => {
    setPinnedId(id);
    setHasNewerBlock(false);
  };
  const unpin = () => {
    setPinnedId(null);
    setHasNewerBlock(false);
  };
  const togglePin = (id: string) => {
    setPinnedId((current) => (current === id ? null : id));
    setHasNewerBlock(false);
  };
  const jumpToLatest = () => {
    setPinnedId(null);
    setHasNewerBlock(false);
  };

  return { activeBlock, pinnedId, isPinned: pinnedId !== null, hasNewerBlock, pin, unpin, togglePin, jumpToLatest };
}
