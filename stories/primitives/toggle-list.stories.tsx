import { useState } from "react";

import { ToggleList, type ToggleItem } from "../../src/ui/toggle-list.js";

export default { title: "Primitives / Toggle list" };

const initial: ToggleItem[] = [
  { id: "web-search", label: "Web search", description: "Allow the agent to search the web.", enabled: true },
  { id: "code-exec", label: "Code execution", description: "Run generated code in a sandbox.", enabled: false },
  { id: "file-write", label: "File write", description: "Allow writes outside the sandbox.", enabled: false, disabled: true },
];

export const Interactive = () => {
  const [items, setItems] = useState(initial);
  return (
    <ToggleList
      label="Available tools"
      items={items}
      onToggle={(item, enabled) =>
        setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, enabled } : entry)))
      }
    />
  );
};

export const Empty = () => <ToggleList label="Available tools" items={[]} onToggle={() => {}} />;
