import { useState } from "react";

import { Textarea } from "../../src/ui/textarea.js";

export default { title: "Primitives / Textarea" };

export const Default = () => {
  const [value, setValue] = useState("");
  return (
    <Textarea
      placeholder="Describe what you want the agent to do."
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
};

export const Focus = () => <Textarea autoFocus placeholder="Describe what you want the agent to do." />;

export const Disabled = () => <Textarea disabled defaultValue="This field is locked." />;

export const Invalid = () => <Textarea aria-invalid defaultValue="This value did not pass validation." />;

export const DisabledWithDescription = () => (
  <div className="flex flex-col gap-1.5">
    <Textarea disabled aria-describedby="task-hint" defaultValue="This field is locked." />
    <p id="task-hint" className="text-xs text-muted-foreground">
      Editing is disabled while the agent is running.
    </p>
  </div>
);

export const InvalidWithDescription = () => (
  <div className="flex flex-col gap-1.5">
    <Textarea aria-invalid aria-describedby="task-error" defaultValue="This value did not pass validation." />
    <p id="task-error" className="text-xs text-destructive">
      Describe the task in 500 characters or fewer.
    </p>
  </div>
);

export const DisabledInvalid = () => (
  <div className="flex flex-col gap-1.5">
    <Textarea disabled aria-invalid aria-describedby="task-disabled-error" defaultValue="This value did not pass validation." />
    <p id="task-disabled-error" className="text-xs text-destructive">
      Describe the task in 500 characters or fewer.
    </p>
  </div>
);

export const AutoResize = () => {
  const [value, setValue] = useState("Short at first.");
  return <Textarea autoResize value={value} onChange={(event) => setValue(event.target.value)} />;
};
