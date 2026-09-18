import { useState } from "react";

import { MicButton, type DictationState } from "../../src/ui/mic-button.js";

export default { title: "Primitives / Mic button" };

const STATES: DictationState[] = ["idle", "starting", "listening", "denied", "unsupported"];

export const AllStates = () => (
  <div className="flex items-center gap-6 p-4">
    {STATES.map((state) => (
      <div key={state} className="flex flex-col items-center gap-2">
        <MicButton state={state} onToggle={() => {}} />
        <span className="text-xs text-muted-foreground">{state}</span>
      </div>
    ))}
  </div>
);

export const Interactive = () => {
  const [state, setState] = useState<DictationState>("idle");
  return (
    <div className="p-4">
      <MicButton
        state={state}
        onToggle={() => setState((current) => (current === "listening" ? "idle" : "listening"))}
      />
    </div>
  );
};
