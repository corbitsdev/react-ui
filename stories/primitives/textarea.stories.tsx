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

export const AutoResize = () => {
  const [value, setValue] = useState("Short at first.");
  return <Textarea autoResize value={value} onChange={(event) => setValue(event.target.value)} />;
};
