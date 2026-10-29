"use client";

import { X } from "lucide-react";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
import type * as React from "react";

import {
  useResizable,
  type ResizableHandleProps,
} from "../hooks/use-resizable.js";
import { inertSiblings } from "../lib/inert-siblings.js";
import { cn } from "../lib/utils.js";
import { Button } from "./button.js";

const isProduction =
  typeof process !== "undefined" && process.env?.NODE_ENV === "production";

const DEFAULT_MIN_WIDTH_PX = 320;
const DEFAULT_MAIN_MIN_WIDTH_PX = 440;

// React 18 does not know `inert` and drops a boolean for it, while React 19
// reads it as a boolean. A non-empty string other than "true" or "false"
// reaches the DOM on both without a warning; the record type is wider than
// React 19's boolean-only `inert` to allow it.
const HIDDEN_PANE_PROPS: Record<string, string> = { inert: "inert" };

type PanelContextValue = {
  readonly panelId: string;
  readonly handleProps: ResizableHandleProps;
};

const PanelContext = createContext<PanelContextValue | null>(null);

function usePanelContext(part: string): PanelContextValue {
  const context = useContext(PanelContext);
  if (context === null) throw new Error(`${part} must be inside a Panel.`);
  return context;
}

type PanelPanesContextValue = {
  readonly value: string;
  readonly keepMounted: boolean;
  /** Development only: a pane reports its value; returns its removal. */
  readonly register: (value: string) => () => void;
};

const PanelPanesContext = createContext<PanelPanesContextValue | null>(null);

export type PanelProps = React.ComponentProps<"aside"> & {
  /**
   * Controlled width in px. `null` is the panel's own default: 46% of the
   * row, between 480px and 760px at the default spacing scale.
   */
  readonly width?: number | null | undefined;
  /** Seeds the width when `width` is not supplied. */
  readonly defaultWidth?: number | null | undefined;
  /** Called once per finished resize, with `null` for a reset. */
  readonly onWidthChange?: ((width: number | null) => void) | undefined;
  /** The narrowest the panel may be set, in px. */
  readonly minWidth?: number;
  /** The width the content beside the panel always keeps, in px. */
  readonly mainMinWidth?: number;
};

/**
 * A side panel at the end of a row, resized from its start edge by a
 * `PanelHandle`.
 *
 * Put it in a row that holds only the main area and the panel, with no gap:
 * `<div className="@container relative flex">` around a `min-w-0 flex-1`
 * main area and the `Panel`. The panel never takes so much of that row that
 * the main area drops below `mainMinWidth`, giving way down to `minWidth`.
 * When the row is narrower than the two side by side (the `@container`
 * query), the panel covers the row instead: it takes focus, hides its
 * handle, and makes the rest of the row inert so focus and assistive
 * technology cannot reach what it covers. This follows the row's size while
 * the panel is open; when the row widens again, focus still on the panel
 * itself goes back to what the overlay took it from.
 *
 * However it closes, focus that was inside the panel goes back to whatever
 * had it before the panel opened. `ref` reaches the `aside` on React 18 and
 * 19.
 */
export const Panel = forwardRef<HTMLElement, PanelProps>(function Panel(
  {
    width,
    defaultWidth,
    onWidthChange,
    minWidth = DEFAULT_MIN_WIDTH_PX,
    mainMinWidth = DEFAULT_MAIN_MIN_WIDTH_PX,
    id,
    style,
    className,
    children,
    onFocus,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const panelId = id ?? generatedId;
  const { panelRef, handleProps } = useResizable({
    width,
    defaultWidth,
    onWidthChange,
    minWidth,
    mainMinWidth,
  });
  const elementRef = useRef<HTMLElement | null>(null);
  // Where focus came from when it last moved into the panel. An `autoFocus`
  // field in a pane takes focus before the mount effect below runs, and
  // this is how that effect still finds the opener.
  const focusedFromRef = useRef<Element | null>(null);
  // What had focus inside the panel when the mount effect last cleaned up.
  // Only StrictMode's simulated remount runs the effect again, and it gives
  // that element its focus back.
  const focusedOnCleanupRef = useRef<HTMLElement | null>(null);

  const setElement = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current = element;
      panelRef(element);
      if (typeof ref === "function") ref(element);
      else if (ref !== null && ref !== undefined) ref.current = element;
    },
    [panelRef, ref],
  );

  useLayoutEffect(() => {
    const panel = elementRef.current;
    if (panel === null) return;
    const opener = panel.contains(document.activeElement)
      ? focusedFromRef.current
      : document.activeElement;
    let restoreSiblings: (() => void) | null = null;
    // What had focus when the panel became an overlay and took it.
    let covered: HTMLElement | null = null;
    // The `@container` query decides whether the panel covers the row, so
    // its computed position is the signal. As an overlay, the panel takes
    // focus and makes the covered main area inert; side by side again, the
    // main area comes back, and so does focus the overlay took if it is
    // still on the panel itself. Re-checked whenever the row resizes, as
    // plain DOM work with no React render.
    const syncOverlay = () => {
      const overlay = getComputedStyle(panel).position === "absolute";
      if (overlay && restoreSiblings === null) {
        const active = document.activeElement;
        if (!panel.contains(active)) {
          covered =
            active instanceof HTMLElement && active !== document.body
              ? active
              : null;
          panel.focus();
        }
        restoreSiblings = inertSiblings(panel);
      } else if (!overlay && restoreSiblings !== null) {
        restoreSiblings();
        restoreSiblings = null;
        if (document.activeElement === panel && covered?.isConnected)
          covered.focus();
        covered = null;
      }
    };
    syncOverlay();
    const refocus = focusedOnCleanupRef.current;
    focusedOnCleanupRef.current = null;
    if (refocus?.isConnected && panel.contains(refocus)) refocus.focus();
    const row = panel.parentElement;
    const observer =
      row === null || typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(syncOverlay);
    if (row !== null) observer?.observe(row);
    // A layout cleanup runs while the panel is still attached, so `contains`
    // still sees focus inside it.
    return () => {
      observer?.disconnect();
      const active = document.activeElement;
      const focusLeftWithPanel =
        active === null || active === document.body || panel.contains(active);
      focusedOnCleanupRef.current =
        active instanceof HTMLElement && panel.contains(active) ? active : null;
      // The opener is usually in the main area, so lift its inertness first.
      restoreSiblings?.();
      if (
        focusLeftWithPanel &&
        opener instanceof HTMLElement &&
        opener !== document.body &&
        opener.isConnected
      ) {
        opener.focus();
      }
    };
  }, []);

  const sizing: Record<`--${string}`, string> = {
    "--panel-min-width": `${minWidth}px`,
    "--panel-main-min-width": `${mainMinWidth}px`,
  };

  return (
    <PanelContext.Provider value={{ panelId, handleProps }}>
      <aside
        ref={setElement}
        id={panelId}
        tabIndex={-1}
        data-slot="panel"
        style={{ ...sizing, ...style }}
        onFocus={(event) => {
          onFocus?.(event);
          if (!event.currentTarget.contains(event.relatedTarget))
            focusedFromRef.current = event.relatedTarget;
        }}
        className={cn(
          "relative flex h-full min-h-0 shrink-0 flex-col border-s border-border bg-background text-foreground focus-visible:-outline-offset-2",
          "w-[var(--resizable-width,clamp(calc(var(--spacing)*120),46%,calc(var(--spacing)*190)))]",
          "max-w-[max(var(--panel-min-width),calc(100%_-_var(--panel-main-min-width)))] min-w-(--panel-min-width)",
          "@max-3xl:absolute @max-3xl:inset-0 @max-3xl:z-30 @max-3xl:w-auto @max-3xl:max-w-none @max-3xl:min-w-0 @max-3xl:border-s-0",
          "motion-safe:animate-[corbits-fade-in_200ms_ease-out]",
          className,
        )}
        {...props}
      >
        {children}
      </aside>
    </PanelContext.Provider>
  );
});

export type PanelHandleProps = Omit<
  React.ComponentProps<"div">,
  keyof ResizableHandleProps | "children"
> & {
  /** The handle's accessible name. */
  readonly label?: string;
};

/**
 * The panel's start edge: a focusable separator over its border. Drag it,
 * use the arrow keys (Shift for bigger steps, Home and End for the limits),
 * or double-click or press Enter to go back to the default width.
 */
export function PanelHandle({
  label = "Resize panel",
  className,
  ...props
}: PanelHandleProps) {
  const { panelId, handleProps } = usePanelContext("PanelHandle");
  return (
    <div
      data-slot="panel-handle"
      aria-label={label}
      aria-controls={panelId}
      className={cn(
        "group/handle absolute inset-y-0 -start-1.5 z-10 w-3 cursor-col-resize touch-none @max-3xl:hidden",
        className,
      )}
      {...props}
      {...handleProps}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 start-1/2 w-px -translate-x-px bg-transparent transition-colors rtl:translate-x-px",
          "group-hover/handle:bg-border-strong group-focus-visible/handle:bg-primary group-data-[dragging=true]/handle:bg-primary",
        )}
      />
    </div>
  );
}

/** The panel's top row: a title, then `PanelActions`. */
export function PanelHeader({
  className,
  ...props
}: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="panel-header"
      className={cn(
        "flex min-h-11 shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-1.5 text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** The header's controls, kept at its end edge. */
export function PanelActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-actions"
      className={cn("ms-auto flex shrink-0 items-center gap-0.5", className)}
      {...props}
    />
  );
}

export type PanelCloseProps = Omit<
  React.ComponentProps<"button">,
  "children"
> & {
  /** The button's accessible name. */
  readonly label?: string;
};

/** Closes the panel: the caller unmounts it from `onClick`. */
export function PanelClose({
  label = "Close panel",
  className,
  ...props
}: PanelCloseProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-slot="panel-close"
      aria-label={label}
      className={cn("size-8", className)}
      {...props}
    >
      <X aria-hidden />
    </Button>
  );
}

export type PanelContentProps = React.ComponentProps<"div"> & {
  /** The `value` of the `PanelPane` to show. */
  readonly value: string;
  /**
   * Keep every pane mounted, hiding all but the shown one, so a pane keeps
   * its scroll position and anything typed in it while another is in front.
   * Focus in a pane as it is hidden moves to the panel. Without it only the
   * shown pane is mounted.
   */
  readonly keepMounted?: boolean;
};

/** The panel's body: holds its `PanelPane`s and shows one at a time. */
export function PanelContent({
  value,
  keepMounted = false,
  className,
  ...props
}: PanelContentProps) {
  // Every mounted pane's value, kept in development to catch host mistakes:
  // panes report from effects, which run before this component's own.
  const registeredRef = useRef<string[]>([]);
  const register = useCallback((paneValue: string) => {
    const registered = registeredRef.current;
    registered.push(paneValue);
    return () => {
      registered.splice(registered.indexOf(paneValue), 1);
    };
  }, []);

  useEffect(() => {
    if (isProduction) return;
    const registered = registeredRef.current;
    if (registered.length === 0) return;
    const duplicate = registered.find(
      (paneValue, index) => registered.indexOf(paneValue) !== index,
    );
    if (duplicate !== undefined)
      console.error(
        `PanelContent: two PanelPanes share the value \`${duplicate}\`.`,
      );
    if (!registered.includes(value))
      console.error(
        "PanelContent: `value` names none of its panes, so the panel body is empty.",
      );
  });

  // A pane hidden with focus inside it would drop that focus to the page
  // once the browser applies `inert`, which happens at the next frame, not
  // yet here. The panel takes it instead.
  useLayoutEffect(() => {
    const pane = document.activeElement?.closest(
      '[data-slot="panel-pane"][inert]',
    );
    pane?.closest<HTMLElement>('[data-slot="panel"]')?.focus();
  }, [value]);

  return (
    <PanelPanesContext.Provider value={{ value, keepMounted, register }}>
      <div
        data-slot="panel-content"
        className={cn("grid min-h-0 flex-1 grid-cols-1 grid-rows-1", className)}
        {...props}
      />
    </PanelPanesContext.Provider>
  );
}

export type PanelPaneProps = React.ComponentProps<"div"> & {
  /** Matched against `PanelContent`'s `value`. */
  readonly value: string;
};

/**
 * One pane of the panel, and its scroll container. A hidden pane kept
 * mounted is invisible and inert rather than removed from layout, which is
 * what keeps its scroll offset.
 */
export function PanelPane({ value, className, ...props }: PanelPaneProps) {
  const context = useContext(PanelPanesContext);
  if (context === null)
    throw new Error("PanelPane must be inside PanelContent.");
  const { register } = context;
  useEffect(
    () => (isProduction ? undefined : register(value)),
    [register, value],
  );
  const shown = context.value === value;
  if (!shown && !context.keepMounted) return null;
  return (
    <div
      data-slot="panel-pane"
      data-state={shown ? "active" : "inactive"}
      {...(shown ? null : HIDDEN_PANE_PROPS)}
      className={cn(
        "col-start-1 row-start-1 min-h-0 min-w-0 overflow-y-auto",
        !shown && "invisible",
        className,
      )}
      {...props}
    />
  );
}
