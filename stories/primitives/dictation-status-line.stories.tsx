import { DictationStatusLine } from "../../src/ui/dictation-status-line.js";

export default { title: "Primitives / Dictation status line" };

const LEVELS = Array.from({ length: 24 }, (_, i) => Math.abs(Math.sin(i / 2)));

export const Starting = () => (
  <div className="max-w-sm p-4">
    <DictationStatusLine state="starting" />
  </div>
);

export const Listening = () => (
  <div className="max-w-sm p-4">
    <DictationStatusLine state="listening" levels={LEVELS} />
  </div>
);

export const Denied = () => (
  <div className="max-w-sm p-4">
    <DictationStatusLine
      state="denied"
      errorMessage="Dictation was not allowed. Microphone and speech recognition permission are needed."
    />
  </div>
);

export const Idle = () => (
  <div className="max-w-sm p-4 text-xs text-muted-foreground">
    (nothing renders while idle) <DictationStatusLine state="idle" />
  </div>
);
