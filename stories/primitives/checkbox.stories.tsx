import { useState } from "react";

import { Checkbox } from "../../src/ui/checkbox.js";

export default { title: "Primitives / Checkbox" };

export const Default = () => {
  const [checked, setChecked] = useState(true);
  return (
    <Checkbox
      label="Auto-approve safe actions"
      description="The agent may act without asking when the risk is low."
      checked={checked}
      onCheckedChange={setChecked}
    />
  );
};

export const Focus = () => (
  <Checkbox label="Auto-approve safe actions" checked={false} onCheckedChange={() => {}} id="focus-demo" />
);

export const Disabled = () => (
  <div className="flex flex-col gap-3">
    <Checkbox label="Disabled unchecked" checked={false} onCheckedChange={() => {}} disabled />
    <Checkbox label="Disabled checked" checked onCheckedChange={() => {}} disabled />
  </div>
);

export const Invalid = () => (
  <Checkbox
    label="I agree to the terms"
    description="Required to continue."
    checked={false}
    onCheckedChange={() => {}}
    invalid
  />
);

export const Indeterminate = () => {
  const [items, setItems] = useState([true, false, false]);
  const allChecked = items.every(Boolean);
  const someChecked = items.some(Boolean);

  return (
    <div className="flex flex-col gap-2">
      <Checkbox
        label="Select all"
        checked={allChecked}
        indeterminate={someChecked && !allChecked}
        onCheckedChange={(checked) => setItems(items.map(() => checked))}
      />
      <div className="ml-6 flex flex-col gap-2">
        {items.map((checked, index) => (
          <Checkbox
            key={index}
            label={`Item ${index + 1}`}
            checked={checked}
            onCheckedChange={(next) =>
              setItems(items.map((value, itemIndex) => (itemIndex === index ? next : value)))
            }
          />
        ))}
      </div>
    </div>
  );
};
