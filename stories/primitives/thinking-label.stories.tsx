import { ThinkingLabel } from "../../src/ui/thinking-label.js";

export default { title: "Primitives / Thinking label" };

export const Default = () => (
  <div className="p-4">
    <ThinkingLabel verbs={["Reading", "Searching", "Writing"]} />
  </div>
);

export const FastRotation = () => (
  <div className="p-4">
    <ThinkingLabel
      verbs={["Listening", "Sharpening the problem", "Writing the brief"]}
      intervalMs={900}
    />
  </div>
);

export const SingleVerb = () => (
  <div className="p-4">
    <ThinkingLabel verbs={["Thinking"]} />
  </div>
);
