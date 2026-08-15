import { useState } from "react";

import { Select } from "../../src/ui/select.js";

export default { title: "Primitives / Select" };

const options = [
  { value: "sonnet", label: "Sonnet" },
  { value: "opus", label: "Opus" },
  { value: "haiku", label: "Haiku" },
];

export const Default = () => {
  const [value, setValue] = useState("sonnet");
  return (
    <Select value={value} onChange={(event) => setValue(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
};

export const Focus = () => (
  <Select autoFocus defaultValue="sonnet">
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </Select>
);

export const Disabled = () => (
  <Select disabled defaultValue="sonnet">
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </Select>
);

export const Invalid = () => (
  <Select aria-invalid defaultValue="sonnet">
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </Select>
);

export const DisabledWithDescription = () => (
  <div className="flex flex-col gap-1.5">
    <Select disabled aria-describedby="model-select-hint" defaultValue="sonnet">
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
    <p id="model-select-hint" className="text-xs text-muted-foreground">
      Model selection is locked for this workspace.
    </p>
  </div>
);

export const InvalidWithDescription = () => (
  <div className="flex flex-col gap-1.5">
    <Select aria-invalid aria-describedby="model-select-error" defaultValue="sonnet">
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
    <p id="model-select-error" className="text-xs text-destructive">
      Choose a model available on your plan.
    </p>
  </div>
);

export const DisabledInvalid = () => (
  <div className="flex flex-col gap-1.5">
    <Select disabled aria-invalid aria-describedby="model-select-disabled-error" defaultValue="sonnet">
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
    <p id="model-select-disabled-error" className="text-xs text-destructive">
      Choose a model available on your plan.
    </p>
  </div>
);
