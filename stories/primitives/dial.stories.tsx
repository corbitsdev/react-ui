import { useState } from "react";

import { Dial } from "../../src/ui/dial.js";

export default { title: "Primitives / Dial" };

export const Interactive = () => {
  const [value, setValue] = useState(0.7);
  return (
    <Dial
      label="Creativity"
      value={value}
      onValueChange={setValue}
      min={0}
      max={1}
      step={0.1}
      description="Higher values allow more varied responses."
      valueText={value >= 0.7 ? "Creative" : value >= 0.4 ? "Balanced" : "Focused"}
    />
  );
};

export const Disabled = () => (
  <Dial label="Token budget" value={40} onValueChange={() => {}} min={0} max={100} disabled />
);
