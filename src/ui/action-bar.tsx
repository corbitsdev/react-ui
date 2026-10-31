"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import {
  forwardRef,
  Fragment,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import { cn } from "../lib/utils.js";
import { buttonVariants } from "./button.js";

export type ActionBarAction = {
  readonly id: string;
  /** Accessible name and tooltip. */
  readonly label: string;
  readonly icon?: ReactNode | undefined;
  /** Visible words before the icon, for a value such as "v4" or the current screen. */
  readonly text?: string | undefined;
  readonly active?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly onSelect?: (() => void) | undefined;
  /** Readies what `onSelect` needs, as a pointer or focus reaches the action. */
  readonly onPrepare?: (() => void) | undefined;
  /**
   * Wraps the action's button, such as in a `Menu` with the button as its
   * `MenuTrigger asChild`. The button forwards its ref, so any `asChild`
   * trigger works.
   */
  readonly renderTrigger?: ((trigger: ReactElement) => ReactNode) | undefined;
  /** A quiet badge that says something about the view rather than acting on it. */
  readonly note?: boolean | undefined;
  /** A strip named by `label` that scrolls sideways rather than widen the bar. */
  readonly row?: readonly ActionBarAction[] | undefined;
  readonly ref?: Ref<HTMLButtonElement> | undefined;
};

export type ActionBarGroup = readonly ActionBarAction[];

export type ActionBarProps = {
  /** The toolbar's accessible name. */
  readonly label: string;
  /** Drawn in order with a rule between; empty groups are skipped. */
  readonly groups: readonly ActionBarGroup[];
  /**
   * `floating` pins the bar to the bottom centre of the nearest positioned
   * ancestor and lets it collapse to a small handle; `inline` sticks to the
   * foot of its scroll container.
   */
  readonly placement?: "inline" | "floating" | undefined;
  readonly collapsed?: boolean | undefined;
  readonly defaultCollapsed?: boolean | undefined;
  readonly onCollapsedChange?: ((collapsed: boolean) => void) | undefined;
  /** A panel shown just above the bar, such as one an action opens. */
  readonly popover?: ReactNode | undefined;
  /** The element around the bar and its popover, so a press on either can count as inside. */
  readonly rootRef?: Ref<HTMLDivElement> | undefined;
  /** The bar itself, or its handle while collapsed, for measuring the space it covers. */
  readonly barRef?: Ref<HTMLElement> | undefined;
  readonly collapseLabel?: string | undefined;
  readonly expandLabel?: string | undefined;
  readonly className?: string | undefined;
};

const COLLAPSE_ID = "action-bar:collapse";

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref !== null && ref !== undefined)
    (ref as RefObject<T | null>).current = node;
}

function focusableIds(groups: readonly ActionBarGroup[]): string[] {
  return groups
    .flat()
    .flatMap((action) => action.row ?? [action])
    .filter((action) => action.note !== true && action.disabled !== true)
    .map((action) => action.id);
}

// The library's Button takes `ref` as a prop, which React 18 drops from
// function components; an `asChild` trigger needs the button node on 18 too.
const BarButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button"> & {
    variant: "ghost" | "secondary";
    size: "icon" | "sm";
  }
>(function BarButton({ variant, size, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      data-action-bar-item=""
      className={cn(
        buttonVariants({ variant, size }),
        "rounded-full tabular-nums",
        variant === "ghost" && "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
});

// Scrolls only the strip, never the page, so the pressed action stays in sight as it changes.
function ActionRow({
  label,
  actions,
  render,
}: {
  label: string;
  actions: readonly ActionBarAction[];
  render: (action: ActionBarAction) => ReactNode;
}) {
  const row = useRef<HTMLDivElement>(null);
  const pressed = actions.findIndex((action) => action.active === true);
  useEffect(() => {
    const strip = row.current;
    const chip = strip?.children[pressed];
    if (strip === null || !(chip instanceof HTMLElement)) return;
    if (chip.offsetLeft < strip.scrollLeft) strip.scrollLeft = chip.offsetLeft;
    else if (
      chip.offsetLeft + chip.offsetWidth >
      strip.scrollLeft + strip.clientWidth
    )
      strip.scrollLeft = chip.offsetLeft + chip.offsetWidth - strip.clientWidth;
  }, [pressed, actions.length]);
  return (
    <div
      ref={row}
      role="group"
      aria-label={label}
      // The padding keeps a focused chip's ring inside the scroll box, which would clip it.
      className="relative -my-1 flex min-w-0 shrink gap-0.5 overflow-x-auto p-1 [scrollbar-width:none] [&>*]:shrink-0"
    >
      {actions.map((action) => (
        <Fragment key={action.id}>{render(action)}</Fragment>
      ))}
    </div>
  );
}

/**
 * One bar of quiet controls for a view: groups of icon or text buttons with a
 * rule between them, toggles, menus, status notes and a sideways-scrolling
 * strip. A `toolbar` with one tab stop; arrow keys, Home and End move between
 * its controls. Floating, it can collapse to a handle so the content under it
 * shows; the host keeps that choice through `collapsed`/`onCollapsedChange`.
 */
export function ActionBar({
  label,
  groups,
  placement = "inline",
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  popover,
  rootRef,
  barRef,
  collapseLabel = "Hide controls",
  expandLabel = "Show controls",
  className,
}: ActionBarProps) {
  const floating = placement === "floating";
  const [collapsed, setCollapsed] = useControllableState({
    value: collapsedProp,
    defaultValue: defaultCollapsed,
    onChange: onCollapsedChange,
    name: "ActionBar",
  });
  const shown = groups.filter((group) => group.length > 0);
  const ids = [...focusableIds(shown), ...(floating ? [COLLAPSE_ID] : [])];
  const [current, setCurrent] = useState<string | null>(null);
  const tabStop = current !== null && ids.includes(current) ? current : ids[0];

  const handle = useRef<HTMLButtonElement | null>(null);
  const collapseButton = useRef<HTMLButtonElement>(null);
  // The state a press on the bar's own toggle asked for. Read on the next
  // render either way, so a host that keeps the old state clears it too.
  const requested = useRef<boolean | null>(null);
  useEffect(() => {
    if (requested.current === null) return;
    if (requested.current === collapsed)
      (collapsed ? handle : collapseButton).current?.focus();
    requested.current = null;
  });
  const toggle = (next: boolean) => {
    requested.current = next;
    setCollapsed(next);
  };

  if (shown.length === 0) return null;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Keys from a menu portalled out of the bar bubble here through React, not the DOM.
    if (!(event.target instanceof Node)) return;
    if (!event.currentTarget.contains(event.target)) return;
    const items = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
        "button[data-action-bar-item]:not(:disabled)",
      ),
    ];
    const at = items.indexOf(event.target as HTMLButtonElement);
    if (at === -1) return;
    const next =
      event.key === "ArrowRight"
        ? items[(at + 1) % items.length]
        : event.key === "ArrowLeft"
          ? items[(at - 1 + items.length) % items.length]
          : event.key === "Home"
            ? items[0]
            : event.key === "End"
              ? items[items.length - 1]
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    next.focus();
  }

  function renderAction(action: ActionBarAction): ReactNode {
    if (action.row !== undefined)
      return (
        <ActionRow
          label={action.label}
          actions={action.row}
          render={renderAction}
        />
      );
    const words = action.text === undefined ? null : <span>{action.text}</span>;
    if (action.note === true)
      return (
        <span
          role="status"
          aria-label={action.label}
          title={action.label}
          className="inline-flex items-center gap-1 px-2 text-xs font-medium whitespace-nowrap text-muted-foreground"
        >
          {action.icon}
          {words}
        </span>
      );
    const button = (
      <BarButton
        ref={action.ref}
        variant={action.active === true ? "secondary" : "ghost"}
        size={words === null ? "icon" : "sm"}
        tabIndex={action.id === tabStop ? 0 : -1}
        aria-label={action.label}
        title={action.label}
        disabled={action.disabled}
        aria-pressed={action.active}
        onClick={action.onSelect}
        onPointerEnter={action.onPrepare}
        onFocus={() => {
          setCurrent(action.id);
          action.onPrepare?.();
        }}
      >
        {words}
        {action.icon}
      </BarButton>
    );
    return action.renderTrigger === undefined
      ? button
      : action.renderTrigger(button);
  }

  const rule = (
    <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-border" />
  );

  const bar =
    floating && collapsed ? (
      <button
        ref={(node) => {
          handle.current = node;
          assignRef(barRef, node);
        }}
        type="button"
        aria-label={expandLabel}
        title={expandLabel}
        onClick={() => toggle(false)}
        className="inline-flex h-5 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-80 transition-opacity hover:opacity-100 focus-visible:opacity-100 [&_svg]:size-3.5"
      >
        <ChevronUp aria-hidden="true" />
      </button>
    ) : (
      <div
        ref={(node) => assignRef(barRef, node)}
        role="toolbar"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex max-w-full min-w-0 shrink-0 items-center gap-0.5 rounded-full border border-border bg-background p-[3px]"
      >
        {shown.map((group, index) => (
          <Fragment key={group.map((action) => action.id).join(" ")}>
            {index > 0 ? rule : null}
            {group.map((action) => (
              <Fragment key={action.id}>{renderAction(action)}</Fragment>
            ))}
          </Fragment>
        ))}
        {floating ? (
          <>
            {rule}
            <BarButton
              ref={collapseButton}
              variant="ghost"
              size="icon"
              tabIndex={tabStop === COLLAPSE_ID ? 0 : -1}
              aria-label={collapseLabel}
              title={collapseLabel}
              onFocus={() => setCurrent(COLLAPSE_ID)}
              onClick={() => toggle(true)}
            >
              <ChevronDown aria-hidden="true" />
            </BarButton>
          </>
        ) : null}
      </div>
    );

  return (
    <div
      ref={rootRef}
      data-slot="action-bar"
      className={cn(
        "flex min-w-0 flex-col items-center gap-2",
        floating
          ? cn(
              "pointer-events-none absolute inset-x-2 [&>*]:pointer-events-auto",
              popover === undefined
                ? "bottom-3 z-[2]"
                : // Spans the container so a tall popover shrinks to fit rather than leave it.
                  "inset-y-3 z-[3] justify-end",
            )
          : "sticky bottom-3 z-[2] mt-auto max-w-[calc(100%-1rem)] self-center",
        className,
      )}
    >
      {popover}
      {bar}
    </div>
  );
}
