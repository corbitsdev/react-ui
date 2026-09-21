import { useEffect, useState } from "react";

import { VoiceWaveform } from "../../src/ui/voice-waveform.js";

export default { title: "Primitives / Voice waveform" };

const BARS = 24;

export const Static = () => (
  <div className="p-4 text-primary-emphasis">
    <VoiceWaveform levels={Array.from({ length: BARS }, (_, i) => (i % 5) / 5)} />
  </div>
);

export const Live = () => {
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  useEffect(() => {
    const id = setInterval(() => {
      setLevels((current) => [...current.slice(1), Math.random()]);
    }, 100);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="p-4 text-primary-emphasis">
      <VoiceWaveform levels={levels} />
    </div>
  );
};
