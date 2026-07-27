import type { Recurrence } from "../lib/schedule.js";
import { cn } from "../lib/utils.js";
import { Button } from "./button.js";
import { Input } from "./input.js";
import { IntakeForm, intakeFieldsComplete, type IntakeField } from "./intake-form.js";
import { RecurrenceInput } from "./recurrence-input.js";

export type ScheduleDraft = {
  readonly name: string;
  readonly recurrence: Recurrence;
  readonly values: Record<string, unknown>;
};

export type ScheduleFlowProps = {
  readonly draft: ScheduleDraft;
  readonly onDraftChange: (next: ScheduleDraft) => void;
  /** The inputs the scheduled thing needs — the same fields a one-off run uses. */
  readonly fields: readonly IntakeField[];
  readonly onSave: () => void;
  readonly onCancel: () => void;
  /** Offered only when editing. Its absence is how this knows it is a create. */
  readonly onDelete?: () => void;
  readonly busy?: boolean;
  readonly error?: string | null;
  readonly className?: string;
};

/**
 * Create or edit a repeating job: what to call it, how often, and the inputs it
 * runs with.
 *
 * The same `IntakeForm` a one-off run uses. A schedule is a run plus a
 * recurrence, and giving the two surfaces separate field renderers is how they
 * start disagreeing about what a workflow needs.
 *
 * Create and edit are one component, distinguished by whether `onDelete` was
 * given. They differ by one button; two components would differ by one button
 * and then, quietly, by more.
 *
 * Delete sits apart from save and cancel, and is destructive-styled. It is the
 * one control here that loses something.
 */
export function ScheduleFlow({
  draft,
  onDraftChange,
  fields,
  onSave,
  onCancel,
  onDelete,
  busy = false,
  error = null,
  className,
}: ScheduleFlowProps) {
  const named = draft.name.trim().length > 0;
  const complete = named && intakeFieldsComplete(fields, draft.values);

  return (
    <form
      className={cn("flex flex-col gap-5", className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (complete) onSave();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="schedule-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="schedule-name"
          value={draft.name}
          required
          disabled={busy}
          placeholder="Morning brief"
          onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
        />
      </div>

      <RecurrenceInput
        value={draft.recurrence}
        disabled={busy}
        onChange={(recurrence) => onDraftChange({ ...draft, recurrence })}
      />

      <IntakeForm
        fields={fields}
        values={draft.values}
        disabled={busy}
        idPrefix="schedule"
        onChange={(values) => onDraftChange({ ...draft, values })}
      />

      {error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button type="submit" size="sm" disabled={busy || !complete}>
          {busy ? "Saving…" : onDelete === undefined ? "Create schedule" : "Save schedule"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        {onDelete === undefined ? null : (
          <Button type="button" variant="destructive" size="sm" onClick={onDelete} disabled={busy} className="ml-auto">
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
