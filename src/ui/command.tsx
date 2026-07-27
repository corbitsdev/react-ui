import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

/** One thing the user can do. */
export type CommandAction = {
  readonly id: string;
  readonly label: string;
  /** Section heading. Actions with no group render before any grouped ones. */
  readonly group?: string;
  /** Extra words that should find this action — synonyms, the old name for it. */
  readonly keywords?: readonly string[];
  readonly icon?: ReactNode;
  /** Displayed hint like "⌘K". Purely a label; this file binds nothing. */
  readonly shortcut?: string;
  readonly run: () => void;
};

/**
 * Subsequence matching, case-insensitive: "wfr" finds "Workflow runs".
 *
 * Deliberately not fuzzy-with-scoring. A scored ranker reorders results as you
 * type, so the row under your cursor moves out from under it — and in a command
 * palette, muscle memory beats cleverness. Order here is the order given.
 */
export function commandMatches(action: CommandAction, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;

  const haystacks = [action.label, action.group ?? "", ...(action.keywords ?? [])];
  return haystacks.some((haystack) => {
    const text = haystack.toLowerCase();
    let index = 0;
    for (const char of needle) {
      index = text.indexOf(char, index);
      if (index === -1) return false;
      index += 1;
    }
    return true;
  });
}

export type CommandProps = {
  readonly actions: readonly CommandAction[];
  /** Accessible name for the surface, e.g. "Commands". */
  readonly label: string;
  /** Called after an action runs — a palette closes itself here. */
  readonly onRun?: (action: CommandAction) => void;
  readonly placeholder?: string;
  readonly empty?: ReactNode;
  readonly className?: string;
};

/**
 * A filterable, keyboard-driven action list — the primitive behind a command
 * palette, a picker, or any "type to narrow, arrow to choose" surface.
 *
 * Hand-rolled rather than wrapping cmdk. This file is copied into a consumer's
 * repo and owned by them, and the behaviour worth changing — the matching — is
 * one exported function they can rewrite. A dependency would make the one thing
 * every app customises the one thing they cannot touch.
 *
 * Actions are a prop rather than something items self-register: a flat list the
 * component filters is testable as a pure function of its input, and a
 * registration protocol would put the render order at the mercy of mount order.
 *
 * ARIA combobox: focus stays in the input and the highlight is carried by
 * `aria-activedescendant`. Moving real focus onto options would take it out of
 * the input and stop typing, which is the entire interaction.
 */
export function Command({
  actions,
  label,
  onRun,
  placeholder = "Type a command…",
  empty = "No matching commands.",
  className,
}: CommandProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const baseId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => actions.filter((action) => commandMatches(action, query)), [actions, query]);

  // The highlight is an index into a list that shrinks as you type; clamp it
  // rather than letting aria-activedescendant point at an id that is gone.
  const active = Math.min(activeIndex, Math.max(visible.length - 1, 0));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, query]);

  const run = (action: CommandAction) => {
    action.run();
    onRun?.(action);
  };

  const optionId = (index: number) => `${baseId}-option-${index}`;

  // Grouped for display, but the keyboard walks `visible` in order — so the
  // index the user is on always means the same row they can see.
  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, { action: CommandAction; index: number }[]>();
    visible.forEach((action, index) => {
      const key = action.group ?? "";
      if (!byGroup.has(key)) {
        byGroup.set(key, []);
        order.push(key);
      }
      byGroup.get(key)?.push({ action, index });
    });
    return order.map((key) => ({ heading: key, items: byGroup.get(key) ?? [] }));
  }, [visible]);

  return (
    <div
      className={cn("flex min-h-0 flex-col", className)}
      onKeyDown={(event) => {
        if (visible.length === 0) return;
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActiveIndex((active + 1) % visible.length);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setActiveIndex((active - 1 + visible.length) % visible.length);
        } else if (event.key === "Home") {
          event.preventDefault();
          setActiveIndex(0);
        } else if (event.key === "End") {
          event.preventDefault();
          setActiveIndex(visible.length - 1);
        } else if (event.key === "Enter") {
          event.preventDefault();
          const action = visible[active];
          if (action !== undefined) run(action);
        }
      }}
    >
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        aria-label={label}
        aria-expanded
        aria-controls={`${baseId}-list`}
        aria-activedescendant={visible.length === 0 ? undefined : optionId(active)}
        aria-autocomplete="list"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
        }}
        className="h-12 w-full shrink-0 border-b border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
      />

      <ul ref={listRef} id={`${baseId}-list`} role="listbox" aria-label={label} className="min-h-0 flex-1 overflow-y-auto p-2">
        {visible.length === 0 ? (
          <li role="presentation" className="px-2 py-8 text-center text-sm text-muted-foreground">
            {empty}
          </li>
        ) : (
          groups.map((group) => (
            <li key={group.heading || "ungrouped"} role="presentation">
              {group.heading === "" ? null : (
                <p className="px-2 py-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                  {group.heading}
                </p>
              )}
              <ul role="presentation">
                {group.items.map(({ action, index }) => (
                  <li
                    key={action.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === active}
                    data-active={index === active}
                    onPointerMove={() => setActiveIndex(index)}
                    onClick={() => run(action)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm",
                      index === active && "bg-muted",
                    )}
                  >
                    {action.icon === undefined ? null : (
                      <span
                        className="grid size-4 shrink-0 place-items-center text-muted-foreground [&_svg]:size-4"
                        aria-hidden
                      >
                        {action.icon}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{action.label}</span>
                    {action.shortcut === undefined ? null : (
                      <kbd className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {action.shortcut}
                      </kbd>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
