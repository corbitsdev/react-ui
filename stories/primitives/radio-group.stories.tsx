import { useState } from "react";

import { RadioGroup, RadioOption } from "../../src/ui/radio-group.js";

export default { title: "Primitives / Radio group" };

export const Default = () => {
  const [value, setValue] = useState("sonnet");
  return (
    <RadioGroup name="model" label="Model" value={value} onValueChange={setValue}>
      <RadioOption value="sonnet" label="Sonnet" description="Balanced speed and capability." />
      <RadioOption value="opus" label="Opus" description="Most capable, slower and pricier." />
      <RadioOption value="haiku" label="Haiku" description="Fastest, best for simple tasks." />
    </RadioGroup>
  );
};

export const Focus = () => {
  const [value, setValue] = useState("sonnet");
  return (
    <RadioGroup name="model-focus" label="Model" value={value} onValueChange={setValue}>
      <RadioOption value="sonnet" label="Sonnet" />
      <RadioOption value="opus" label="Opus" />
    </RadioGroup>
  );
};

export const Disabled = () => (
  <RadioGroup name="model-disabled" label="Model" value="sonnet" onValueChange={() => {}}>
    <RadioOption value="sonnet" label="Sonnet" />
    <RadioOption value="opus" label="Opus" disabled />
  </RadioGroup>
);

export const Invalid = () => (
  <RadioGroup name="model-invalid" label="Model" value="" onValueChange={() => {}}>
    <RadioOption value="sonnet" label="Sonnet" invalid />
    <RadioOption value="opus" label="Opus" invalid />
  </RadioGroup>
);

export const WithDescriptions = () => {
  const [value, setValue] = useState("agent");
  return (
    <RadioGroup name="mode" label="Mode" value={value} onValueChange={setValue}>
      <RadioOption value="agent" label="Agent" description="Plans and runs multi-step work on its own." />
      <RadioOption value="chat" label="Chat" description="Responds in the thread, one turn at a time." />
      <RadioOption value="review" label="Review" description="Reads and comments without taking action." />
    </RadioGroup>
  );
};
