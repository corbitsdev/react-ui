import { useState } from "react";
import { ThinkingIndicator } from "../../src/ui/thinking-indicator.js";
import { ThinkingMark, type ThinkingVariant } from "../../src/ui/thinking-mark.js";
import { Button } from "../../src/ui/button.js";

export default { title: "Primitives / Thinking indicator" };

const variants: ThinkingVariant[] = ["silk", "strata", "echo"];

export const AllVariants = () => {
  const [paused, setPaused] = useState(false);
  return (
    <div className="max-w-4xl space-y-6 p-6">
      <Button variant="outline" onClick={() => setPaused(!paused)} aria-pressed={paused}>
        {paused ? "Play" : "Pause"}
      </Button>
      <div className="grid gap-6 sm:grid-cols-3">
        {variants.map((variant) => (
          <section key={variant} className="space-y-8 rounded-xl border bg-card p-6">
            <h2 className="text-lg capitalize">{variant}</h2>
            <div className="flex h-40 items-center justify-center">
              <ThinkingMark variant={variant} paused={paused} className="max-w-full" style={{ width: 180 }} />
            </div>
            <ThinkingIndicator variant={variant} paused={paused} />
          </section>
        ))}
      </div>
    </div>
  );
};

export const Silk = () => <ThinkingIndicator variant="silk" />;
export const Strata = () => <ThinkingIndicator variant="strata" />;
export const Echo = () => <ThinkingIndicator variant="echo" />;
export const CustomLabel = () => <ThinkingIndicator variant="echo" label="Reviewing your files..." />;
