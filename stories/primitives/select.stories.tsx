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
