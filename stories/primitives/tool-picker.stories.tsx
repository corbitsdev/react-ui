import { useState } from "react";

import { ToolPicker, type ToolPickerItem } from "../../src/ui/tool-picker.js";

export default { title: "Primitives / Tool picker" };

const ITEMS: ToolPickerItem[] = [
  { id: "slack-post", name: "Post message", package: "slack", description: "Sends a message to a channel." },
  { id: "slack-react", name: "Add reaction", package: "slack", description: "Reacts to an existing message." },
  {
    id: "linear-create",
    name: "Create issue",
    package: "linear",
    description: "Opens a new issue in a team.",
    status: "pending",
  },
  {
    id: "linear-close",
    name: "Close issue",
    package: "linear",
    description: "Already attached elsewhere in this workflow.",
    status: "disabled",
  },
  { id: "gmail-send", name: "Send email", package: "gmail", description: "Sends a message from the connected inbox." },
];

export const SingleSelect = () => {
  const [value, setValue] = useState<readonly string[]>(["slack-post"]);
  return (
    <div className="h-96 w-96">
      <ToolPicker items={ITEMS} value={value} onChange={setValue} />
    </div>
  );
};

export const MultiSelect = () => {
  const [value, setValue] = useState<readonly string[]>(["slack-post", "gmail-send"]);
  return (
    <div className="h-96 w-96">
      <ToolPicker items={ITEMS} value={value} onChange={setValue} multiple />
    </div>
  );
};

export const Loading = () => <ToolPicker items={[]} value={[]} onChange={() => {}} loading />;

export const Empty = () => <ToolPicker items={[]} value={[]} onChange={() => {}} />;
