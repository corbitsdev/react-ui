import { useState } from "react";

import { Switch } from "../../src/ui/switch.js";

export default { title: "Primitives / Switch" };

export const Interactive = () => {
  const [checked, setChecked] = useState(true);
  return <Switch label="Auto-approve safe actions" checked={checked} onCheckedChange={setChecked} />;
};

export const Disabled = () => (
  <div className="flex flex-col gap-3">
    <Switch label="Disabled off" checked={false} onCheckedChange={() => {}} disabled />
    <Switch label="Disabled on" checked onCheckedChange={() => {}} disabled />
  </div>
);
