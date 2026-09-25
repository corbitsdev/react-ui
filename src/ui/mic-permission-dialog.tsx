"use client";

import { Button } from "./button.js";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog.js";

export type MicPermissionDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly detail: string;
  /** Label for the action button, e.g. "Open Sound settings". */
  readonly actionLabel: string;
  readonly onAction: () => void;
  /** Shown when opening the settings pane itself failed. */
  readonly failure?: string | null;
  readonly dismissLabel?: string;
};

/**
 * A refusal that is a setting, put in front of the person with the button
 * that opens the pane. Presentational: it does not know what "open settings"
 * means for a given host (a native shell invoking an OS pane, a browser
 * opening a help link) — the consumer's dictation hook supplies `onAction`
 * and, if that action can itself fail, `failure`.
 */
export function MicPermissionDialog({
  open,
  onOpenChange,
  title,
  detail,
  actionLabel,
  onAction,
  failure = null,
  dismissLabel = "Not now",
}: MicPermissionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{detail}</DialogDescription>
        </DialogHeader>
        {failure ? (
          <DialogBody>
            <p role="alert" className="text-sm text-destructive">
              {failure}
            </p>
          </DialogBody>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {dismissLabel}
          </Button>
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
