import type * as React from "react";
import { useState } from "react";

import { Select } from "../../src/ui/select.js";

export default { title: "Primitives / Select" };

const options = [
  { value: "sonnet", label: "Sonnet" },
  { value: "opus", label: "Opus" },
  { value: "haiku", label: "Haiku" },
];

const optionElements = options.map((option) => (
  <option key={option.value} value={option.value}>
    {option.label}
  </option>
));

function Field({ children }: { readonly children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">Model</span>
      {children}
    </label>
  );
}

export const Default = () => {
  const [value, setValue] = useState("sonnet");
  return (
    <Field>
      <Select value={value} onChange={(event) => setValue(event.target.value)}>
        {optionElements}
      </Select>
    </Field>
  );
};

export const Focus = () => (
  <Field>
    <Select autoFocus defaultValue="sonnet">
      {optionElements}
    </Select>
  </Field>
);

export const Disabled = () => (
  <Field>
    <Select disabled defaultValue="sonnet">
      {optionElements}
    </Select>
  </Field>
);

export const Invalid = () => (
  <Field>
    <Select aria-invalid defaultValue="sonnet">
      {optionElements}
    </Select>
  </Field>
);

export const DisabledWithDescription = () => (
  <div className="flex flex-col gap-1.5">
    <Field>
      <Select
        disabled
        aria-describedby="model-select-hint"
        defaultValue="sonnet"
      >
        {optionElements}
      </Select>
    </Field>
    <p id="model-select-hint" className="text-xs text-muted-foreground">
      Model selection is locked for this workspace.
    </p>
  </div>
);

export const InvalidWithDescription = () => (
  <div className="flex flex-col gap-1.5">
    <Field>
      <Select
        aria-invalid
        aria-describedby="model-select-error"
        defaultValue="sonnet"
      >
        {optionElements}
      </Select>
    </Field>
    <p id="model-select-error" className="text-xs text-destructive">
      Choose a model available on your plan.
    </p>
  </div>
);

export const DisabledInvalid = () => (
  <div className="flex flex-col gap-1.5">
    <Field>
      <Select
        disabled
        aria-invalid
        aria-describedby="model-select-disabled-error"
        defaultValue="sonnet"
      >
        {optionElements}
      </Select>
    </Field>
    <p id="model-select-disabled-error" className="text-xs text-destructive">
      Choose a model available on your plan.
    </p>
  </div>
);
