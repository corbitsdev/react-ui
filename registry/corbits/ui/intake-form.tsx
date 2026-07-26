"use client";

import { useId } from "react";

import { cn } from "@/registry/corbits/lib/utils";
import { Input } from "@/registry/corbits/ui/input";

/**
 * One input a workflow asks for before it runs.
 *
 * A small closed set of types on purpose. Every additional widget is a
 * rendering branch a consumer has to read past to change the one they use, and
 * a workflow that needs a date picker or a file drop is better served by the
 * host composing its own field than by this file growing a case for it.
 */
export type IntakeField = {
  readonly name: string;
  readonly label: string;
  readonly type: "text" | "textarea" | "number" | "boolean" | "select";
  readonly required?: boolean;
  /** Guidance under the control. Wired up with `aria-describedby`. */
  readonly help?: string;
  readonly placeholder?: string;
  /** For `select` only. Ignored otherwise. */
  readonly options?: readonly { readonly value: string; readonly label: string }[];
};

export type IntakeFormProps = {
  readonly fields: readonly IntakeField[];
  readonly values: Readonly<Record<string, unknown>>;
  readonly onChange: (next: Record<string, unknown>) => void;
  /** Disambiguates ids when two forms are on one page. */
  readonly idPrefix?: string;
  readonly disabled?: boolean;
  readonly className?: string;
};

/** True when every required field has a value — for enabling a submit control. */
export function intakeFieldsComplete(
  fields: readonly IntakeField[],
  values: Readonly<Record<string, unknown>>,
): boolean {
  return fields.every((field) => {
    if (field.required !== true) return true;
    const value = values[field.name];
    if (typeof value === "string") return value.trim().length > 0;
    return value !== undefined && value !== null;
  });
}

/**
 * The inputs a run needs, rendered from a field list. Fully controlled: the
 * host owns the values, so the same form backs a one-off run and a saved
 * schedule without this file knowing which.
 */
export function IntakeForm({ fields, values, onChange, idPrefix, disabled = false, className }: IntakeFormProps) {
  const generatedPrefix = useId();
  const prefix = idPrefix ?? generatedPrefix;

  if (fields.length === 0) return null;

  const set = (name: string, value: unknown) => onChange({ ...values, [name]: value });

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {fields.map((field) => {
        const id = `${prefix}-${field.name}`;
        const helpId = field.help === undefined ? undefined : `${id}-help`;
        const value = values[field.name];

        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            {field.type === "boolean" ? (
              <label htmlFor={id} className="flex items-center gap-2 text-sm">
                <input
                  id={id}
                  type="checkbox"
                  checked={value === true}
                  required={field.required}
                  disabled={disabled}
                  aria-describedby={helpId}
                  onChange={(event) => set(field.name, event.target.checked)}
                  className="size-4 rounded-sm border border-input accent-[var(--primary)]"
                />
                {field.label}
                {field.required === true ? <RequiredMark /> : null}
              </label>
            ) : (
              <>
                <label htmlFor={id} className="text-sm font-medium">
                  {field.label}
                  {field.required === true ? <RequiredMark /> : null}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    id={id}
                    value={typeof value === "string" ? value : ""}
                    placeholder={field.placeholder}
                    required={field.required}
                    disabled={disabled}
                    aria-describedby={helpId}
                    rows={4}
                    onChange={(event) => set(field.name, event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  />
                ) : field.type === "select" ? (
                  <select
                    id={id}
                    value={typeof value === "string" ? value : ""}
                    required={field.required}
                    disabled={disabled}
                    aria-describedby={helpId}
                    onChange={(event) => set(field.name, event.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                  >
                    <option value="">Choose…</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={id}
                    type={field.type === "number" ? "number" : "text"}
                    value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
                    placeholder={field.placeholder}
                    required={field.required}
                    disabled={disabled}
                    aria-describedby={helpId}
                    onChange={(event) =>
                      set(field.name, field.type === "number" ? event.target.valueAsNumber : event.target.value)
                    }
                  />
                )}
              </>
            )}
            {field.help === undefined ? null : (
              <p id={helpId} className="text-xs text-muted-foreground">
                {field.help}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// The asterisk is decorative: `required` on the control is what actually tells
// assistive tech, and a screen reader announcing "asterisk" helps nobody.
function RequiredMark() {
  return (
    <span aria-hidden className="ml-0.5 text-primary-emphasis">
      *
    </span>
  );
}
