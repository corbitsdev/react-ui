import type * as React from "react";
import { useState } from "react";

import { Textarea } from "../../src/ui/textarea.js";

export default { title: "Primitives / Textarea" };

function Field({ children }: { readonly children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">Task</span>
      {children}
    </label>
  );
}

export const Default = () => {
  const [value, setValue] = useState("");
  return (
    <Field>
      <Textarea
        placeholder="Describe what you want the agent to do."
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </Field>
  );
};

export const Focus = () => (
  <Field>
    <Textarea autoFocus placeholder="Describe what you want the agent to do." />
  </Field>
);

export const Disabled = () => (
  <Field>
    <Textarea disabled defaultValue="This field is locked." />
  </Field>
);

export const Invalid = () => (
  <Field>
    <Textarea aria-invalid defaultValue="This value did not pass validation." />
  </Field>
);

export const DisabledWithDescription = () => (
  <div className="flex flex-col gap-1.5">
    <Field>
      <Textarea
        disabled
        aria-describedby="task-hint"
        defaultValue="This field is locked."
      />
    </Field>
    <p id="task-hint" className="text-xs text-muted-foreground">
      Editing is disabled while the agent is running.
    </p>
  </div>
);

export const InvalidWithDescription = () => (
  <div className="flex flex-col gap-1.5">
    <Field>
      <Textarea
        aria-invalid
        aria-describedby="task-error"
        defaultValue="This value did not pass validation."
      />
    </Field>
    <p id="task-error" className="text-xs text-destructive">
      Describe the task in 500 characters or fewer.
    </p>
  </div>
);

export const DisabledInvalid = () => (
  <div className="flex flex-col gap-1.5">
    <Field>
      <Textarea
        disabled
        aria-invalid
        aria-describedby="task-disabled-error"
        defaultValue="This value did not pass validation."
      />
    </Field>
    <p id="task-disabled-error" className="text-xs text-destructive">
      Describe the task in 500 characters or fewer.
    </p>
  </div>
);

export const AutoResize = () => {
  const [value, setValue] = useState("Short at first.");
  return (
    <Field>
      <Textarea
        autoResize
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </Field>
  );
};
