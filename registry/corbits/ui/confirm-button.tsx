"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Button, type ButtonProps } from "@/registry/corbits/ui/button";

export type ConfirmButtonProps = Omit<ButtonProps, "onClick" | "children"> & {
  /** Fires on the second, confirming click only. */
  readonly onConfirm: () => void;
  readonly children: ReactNode;
  readonly confirmLabel?: ReactNode;
  /** How long the armed state lasts before disarming, in ms. */
  readonly resetMs?: number;
};

/**
 * A destructive action behind a second click.
 *
 * For actions that are irreversible but small — remove a row, revoke a key —
 * where a modal is more ceremony than the action deserves. Anything with
 * consequences worth reading a sentence about should use a `Dialog` instead;
 * this deliberately gives the user nothing to read.
 *
 * It disarms on blur as well as on a timer. Leaving a primed destructive button
 * behind when the user's attention has moved elsewhere is how the second click
 * lands by accident, which is the exact thing this exists to prevent.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Click again to confirm",
  resetMs = 3000,
  variant = "outline",
  ...props
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  const disarm = () => {
    window.clearTimeout(timerRef.current);
    setArmed(false);
  };

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return (
    <Button
      {...props}
      variant={armed ? "destructive" : variant}
      onBlur={disarm}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          timerRef.current = window.setTimeout(() => setArmed(false), resetMs);
          return;
        }
        disarm();
        onConfirm();
      }}
    >
      {/* aria-live so the label change reaches a screen reader — the button
          keeps focus between the two clicks, so nothing else would say it. */}
      <span aria-live="polite">{armed ? confirmLabel : children}</span>
    </Button>
  );
}
