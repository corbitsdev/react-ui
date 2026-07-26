"use client";

import type { ReactNode } from "react";

import { cn } from "@/registry/corbits/lib/utils";
import { Button } from "@/registry/corbits/ui/button";

export type SettingsPanelProps = {
  readonly title: string;
  readonly description?: ReactNode;
  /**
   * Present a save control. Omit for panels whose controls take effect on
   * change — a Save button that saves nothing new is worse than none.
   */
  readonly onSave?: () => void;
  /** Unsaved changes. Drives the save control and the status line. */
  readonly dirty?: boolean;
  readonly saving?: boolean;
  readonly error?: string | null;
  /** Set after a successful save so the panel can confirm it happened. */
  readonly savedAt?: string | null;
  readonly onReset?: () => void;
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * The frame every settings panel shares: a heading, the controls, and — only
 * where it means something — a save control.
 *
 * There is one shell rather than one component per setting group. "Defaults",
 * "Instructions", "Style" and "Preferences" differ in the fields inside them
 * and in nothing else; a component per group would be nine files forwarding
 * props to the same markup, and they would drift.
 *
 * Nothing here is agent-specific. The panel is titled by its host.
 *
 * The save control is disabled when there is nothing to save, and the panel
 * says why in text as well: a greyed-out button with no explanation is the most
 * common dead end in a settings screen.
 */
export function SettingsPanel({
  title,
  description,
  onSave,
  dirty = false,
  saving = false,
  error = null,
  savedAt = null,
  onReset,
  children,
  className,
}: SettingsPanelProps) {
  return (
    <section
      data-slot="settings-panel"
      aria-label={title}
      className={cn("flex flex-col gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground", className)}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description === undefined ? null : (
          <p className="text-sm leading-snug text-muted-foreground">{description}</p>
        )}
      </div>

      {children}

      {error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {onSave === undefined ? null : (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button size="sm" onClick={onSave} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {onReset === undefined || !dirty ? null : (
            <Button variant="ghost" size="sm" onClick={onReset} disabled={saving}>
              Discard
            </Button>
          )}
          {/* aria-live so the outcome reaches a screen reader without moving
              focus — the user is still in the controls above. */}
          <p aria-live="polite" className="ml-auto text-xs text-muted-foreground">
            {dirty ? "Unsaved changes" : savedAt === null ? "" : `Saved ${savedAt}`}
          </p>
        </div>
      )}
    </section>
  );
}
