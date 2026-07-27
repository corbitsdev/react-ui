import { useEffect, useRef, useState } from "react";

import { Button, type ButtonProps } from "./button.js";

export type RunNowButtonProps = Omit<ButtonProps, "onClick" | "children"> & {
  /** Resolve when the work is accepted, reject to show nothing changed. */
  readonly onRun: () => void | Promise<void>;
  readonly label?: string;
  readonly pendingLabel?: string;
  readonly doneLabel?: string;
  /** How long the confirmation stays up, in ms. */
  readonly confirmMs?: number;
};

/**
 * Fire something off now — send the brief, run the schedule ahead of time.
 *
 * The three states exist because "did that work?" is the only question the user
 * has after pressing it, and a button that snaps back to its resting label
 * answers it with nothing. The confirmation is announced through `aria-live`,
 * not just shown, and the label carries it — a separate toast for a
 * button-sized action is more machinery than the action deserves.
 *
 * A rejected promise returns the button to rest rather than claiming success.
 * The caller surfaces the reason; this only refuses to lie about it.
 */
export function RunNowButton({
  onRun,
  label = "Run now",
  pendingLabel = "Starting…",
  doneLabel = "Started",
  confirmMs = 2000,
  disabled,
  ...props
}: RunNowButtonProps) {
  const [state, setState] = useState<"idle" | "pending" | "done">("idle");
  const timerRef = useRef<number | undefined>(undefined);

  // Clear on unmount: a timer that fires into an unmounted component is a
  // React warning today and a leak in every version.
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const run = async () => {
    setState("pending");
    try {
      await onRun();
      setState("done");
      timerRef.current = window.setTimeout(() => setState("idle"), confirmMs);
    } catch {
      setState("idle");
    }
  };

  return (
    <Button
      {...props}
      disabled={disabled || state !== "idle"}
      onClick={() => {
        void run();
      }}
    >
      <span aria-live="polite">
        {state === "pending" ? pendingLabel : state === "done" ? doneLabel : label}
      </span>
    </Button>
  );
}
