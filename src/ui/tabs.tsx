import { useId, useRef } from "react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type TabDescriptor<Id extends string> = {
  readonly id: Id;
  readonly label: string;
  /** Shown beside the label — a count of what is inside. */
  readonly count?: number;
};

export type TabsProps<Id extends string> = {
  readonly tabs: readonly TabDescriptor<Id>[];
  readonly active: Id;
  readonly onChange: (id: Id) => void;
  /** Names the set for assistive tech: "Insights sections". */
  readonly label: string;
  /** Renders the active panel. Called once — only the open panel is mounted. */
  readonly children: (active: Id) => ReactNode;
  /** `underline` for page-level navigation, `enclosed` for tabs inside a card. */
  readonly variant?: "underline" | "enclosed";
  readonly className?: string;
};

/**
 * Tabs that behave the way the tab pattern promises.
 *
 * The parts people leave out are the parts that matter. A roving `tabIndex`
 * puts *one* stop in the tab list, so Tab moves past the whole set into the
 * panel instead of stepping through every tab — and that only works if arrow
 * keys move between them, which is why `onKeyDown` here is not optional garnish.
 * Home and End jump to the ends. `aria-controls` and `aria-labelledby` tie each
 * tab to its panel in both directions, which is what makes "go to the panel this
 * tab controls" a thing a screen reader can offer.
 *
 * Selection is controlled and only the active panel is mounted. Tab state is
 * almost always also URL state — someone will want to link to a tab — and
 * owning it internally means fighting the component to do that. Mounting one
 * panel keeps hidden panels from fetching, animating, or holding focus.
 *
 * Focus follows the arrow keys, and only the arrow keys. The APG requires it:
 * with a roving `tabIndex` the tab you arrowed away from becomes
 * `tabIndex={-1}` and `aria-selected={false}`, so leaving focus there strands
 * it on a tab that is no longer either the selection or a tab stop, and the
 * next Tab press escapes from the wrong place. Selection by click does *not*
 * move focus — the clicked tab already has it — and focus is never pushed into
 * the panel, which is the "improvement" that stops people arrowing on.
 */
export function Tabs<Id extends string>({
  tabs,
  active,
  onChange,
  label,
  children,
  variant = "underline",
  className,
}: TabsProps<Id>) {
  const base = useId();
  const tabId = (id: Id) => `${base}-tab-${id}`;
  const panelId = (id: Id) => `${base}-panel-${id}`;

  // Every tab button is rendered whatever the selection, so the node to focus
  // already exists at the moment the key is handled — no effect, no timer.
  const buttons = useRef(new Map<Id, HTMLButtonElement>());

  /** Arrow/Home/End selection: change the tab *and* take focus with it. */
  function focusTab(id: Id) {
    onChange(id);
    buttons.current.get(id)?.focus();
  }

  function move(delta: number) {
    const index = tabs.findIndex((tab) => tab.id === active);
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    if (next !== undefined) focusTab(next.id);
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            move(1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            move(-1);
          } else if (event.key === "Home") {
            event.preventDefault();
            if (tabs[0] !== undefined) focusTab(tabs[0].id);
          } else if (event.key === "End") {
            event.preventDefault();
            const last = tabs[tabs.length - 1];
            if (last !== undefined) focusTab(last.id);
          }
        }}
        className={cn(
          "flex flex-wrap items-center",
          variant === "underline" ? "gap-1 border-b border-border" : "gap-1 rounded-md border border-border p-1",
        )}
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                if (node === null) buttons.current.delete(tab.id);
                else buttons.current.set(tab.id, node);
              }}
              type="button"
              role="tab"
              id={tabId(tab.id)}
              aria-selected={selected}
              aria-controls={panelId(tab.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                variant === "underline"
                  ? // The 2px border exists on both states, transparent when
                    // inactive, so selecting a tab does not shift the row.
                    selected
                    ? "-mb-px border-b-2 border-primary-emphasis text-foreground"
                    : "-mb-px border-b-2 border-transparent text-muted-foreground hover:text-foreground"
                  : selected
                    ? "rounded-sm bg-muted text-foreground"
                    : "rounded-sm text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.count === undefined ? null : (
                <span className="rounded-sm bg-muted px-1.5 font-mono text-xs text-muted-foreground">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId(active)} aria-labelledby={tabId(active)} tabIndex={0}>
        {children(active)}
      </div>
    </div>
  );
}
