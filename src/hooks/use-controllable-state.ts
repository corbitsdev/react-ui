import { useCallback, useRef, useState } from "react";

export type ControllableStateAction<T> = T | ((previous: T) => T);

export type UseControllableStateOptions<T> = {
  /** Controlled value. Supply this with `onChange` to lift state to a parent. */
  readonly value?: T;
  /** Seeds the hook's own state when `value` is not supplied. */
  readonly defaultValue: T;
  readonly onChange?: (value: T) => void;
  /** Identifies the caller in the dev-mode controlled/uncontrolled warning below. */
  readonly name: string;
};

const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";

/**
 * The controlled-or-uncontrolled resolution every prop pair shaped like
 * `open`/`onOpenChange` needs: track state internally, but defer to `value`
 * whenever the caller supplies one. `useDismissablePopover`, `ToolBlock` and
 * `ToolNarrative` each want exactly this and previously each wrote their own
 * ternary for it; this is the one place it lives now.
 *
 * The returned setter accepts a value or a React-style updater
 * (`setOpen((prev) => !prev)`), same as `useState`.
 *
 * Like a native `<input>`, a caller is expected to pick controlled or
 * uncontrolled once and keep it for the component's lifetime. Switching
 * between them — `value` present on one render, `undefined` on the next —
 * logs a `console.error` in non-production builds, mirroring React's own
 * controlled/uncontrolled `<input>` warning; it does not throw, and the
 * production build is silent.
 */
export function useControllableState<T>(
  options: UseControllableStateOptions<T>,
): readonly [T, (action: ControllableStateAction<T>) => void] {
  const { value: controlledValue, defaultValue, onChange, name } = options;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const wasControlledRef = useRef(isControlled);
  if (!isProduction && wasControlledRef.current !== isControlled) {
    const from = wasControlledRef.current ? "controlled" : "uncontrolled";
    const to = isControlled ? "controlled" : "uncontrolled";
    console.error(
      `${name} is changing from ${from} to ${to}. Components should not switch between controlled ` +
        "and uncontrolled across their lifetime. Decide between using a controlled or uncontrolled " +
        `value for the lifetime of the component (i.e. always pass a value to \`${name}\`, or never do).`,
    );
  }
  wasControlledRef.current = isControlled;

  const setValue = useCallback(
    (action: ControllableStateAction<T>) => {
      const resolved = typeof action === "function" ? (action as (previous: T) => T)(value) : action;
      if (!isControlled) setUncontrolledValue(resolved);
      onChange?.(resolved);
    },
    [isControlled, value, onChange],
  );

  return [value, setValue] as const;
}
