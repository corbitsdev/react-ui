"use client";

import { Button } from "@/registry/corbits/ui/button";
import { IntakeForm, intakeFieldsComplete, type IntakeField } from "@/registry/corbits/ui/intake-form";

export type RunOnceFlowProps = {
  readonly fields: readonly IntakeField[];
  readonly values: Record<string, unknown>;
  readonly onValuesChange: (next: Record<string, unknown>) => void;
  readonly onRun: () => void;
  readonly onCancel: () => void;
  readonly busy?: boolean;
  /** Failure from the last attempt. Announced, not just shown. */
  readonly error?: string | null;
  readonly className?: string;
};

/**
 * Start one run, now, with these inputs — no recurrence, nothing saved.
 *
 * It submits through a real `<form>` rather than a click handler on a button:
 * that gets Enter-to-submit and the browser's own required-field handling for
 * free, and the `intakeFieldsComplete` check exists to disable the control
 * before the user reaches for it, not to replace validation.
 *
 * No confirmation step. The panel is already the confirmation — the user chose
 * a workflow, filled its inputs and pressed a button that says what it does.
 */
export function RunOnceFlow({
  fields,
  values,
  onValuesChange,
  onRun,
  onCancel,
  busy = false,
  error = null,
  className,
}: RunOnceFlowProps) {
  const complete = intakeFieldsComplete(fields, values);

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        onRun();
      }}
    >
      <p className="text-xs text-muted-foreground">
        {fields.length === 0
          ? "No inputs needed — this runs with its defaults."
          : "Runs once, right now, with the inputs below. It will not repeat."}
      </p>

      <IntakeForm
        fields={fields}
        values={values}
        onChange={onValuesChange}
        disabled={busy}
        className="mt-4"
      />

      {error === null ? null : (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy || !complete}>
          {busy ? "Starting…" : "Run once now"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
