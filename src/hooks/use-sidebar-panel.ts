import { useCallback, useState } from "react";

export type UseSidebarPanelOptions = {
  /** The rail's current page id. Drives which page's content the panel shows. */
  readonly activePageId: string;
  readonly defaultSelectedId?: string | null;
  /** Section ids that start collapsed — a "Direct messages" group folded by default. */
  readonly initiallyCollapsedSectionIds?: readonly string[];
};

export type UseSidebarPanelResult = {
  /** The selected row inside the panel — a channel, a thread. Distinct from `activePageId`. */
  readonly selectedId: string | null;
  readonly select: (id: string | null) => void;
  readonly isSectionCollapsed: (sectionId: string) => boolean;
  readonly toggleSection: (sectionId: string) => void;
  /** Key the swapped-in content with this. A new key is what replays the swap. */
  readonly panelKey: string;
  /** Apply to the element keyed by `panelKey` — see `corbits-panel-swap-in` in theme.css. */
  readonly panelTransitionClassName: string;
};

/**
 * The panel's behaviour, with no markup of its own: which row is selected,
 * which sections are folded, and the key + class a consumer needs to replay
 * the page-swap animation.
 *
 * Selection and collapse are plain `useState` here rather than lifted to the
 * host, because they are UI-only state that resets are fine for — nothing
 * downstream persists "channel #general was selected" across a reload. A
 * host that *does* want to persist it swaps this hook for its own without
 * changing any of `ui/sidebar-panel`'s pieces, since they take everything
 * through props.
 *
 * The swap animation is deliberately not driven by a timer or an
 * `useEffect`. Keying the incoming content on `activePageId` and letting
 * React remount it is what plays `corbits-panel-swap-in` — the same "mount
 * plays the keyframe" trick `SidebarItemRow` uses for its rows — so there is
 * no window where the class is applied before the browser has painted the
 * previous frame.
 */
export function useSidebarPanel({
  activePageId,
  defaultSelectedId = null,
  initiallyCollapsedSectionIds = [],
}: UseSidebarPanelOptions): UseSidebarPanelResult {
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelectedId);
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<ReadonlySet<string>>(
    () => new Set(initiallyCollapsedSectionIds),
  );

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSectionIds((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const isSectionCollapsed = useCallback(
    (sectionId: string) => collapsedSectionIds.has(sectionId),
    [collapsedSectionIds],
  );

  return {
    selectedId,
    select: setSelectedId,
    isSectionCollapsed,
    toggleSection,
    panelKey: activePageId,
    panelTransitionClassName: "animate-[corbits-panel-swap-in_180ms_ease-out]",
  };
}
