import { seriesColor } from "../../lib/chart-palette.js";
import { formatTokens } from "./format.js";
import type { UsageBreakdown } from "./metrics.js";

const USAGE_PARTS = [
  ["input", "Input"],
  ["output", "Output"],
  ["cacheRead", "Cache read"],
  ["cacheWrite", "Cache write"],
  ["thinking", "Thinking"],
] as const;

const USAGE_BAR = {
  input: seriesColor(0),
  output: seriesColor(1),
  cacheRead: seriesColor(3),
  cacheWrite: seriesColor(2),
  thinking: "color-mix(in oklab, var(--foreground) 55%, transparent)",
} as const;

export function UsageMix({ usage }: { readonly usage: UsageBreakdown }) {
  const max = Math.max(
    1,
    usage.input,
    usage.output,
    usage.cacheRead,
    usage.cacheWrite,
    usage.thinking,
  );
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Usage</h3>
      <p className="text-xs text-muted-foreground">
        Cache read is a slice of input, not an extra charge on top of it.
      </p>
      <ul className="flex flex-col gap-1.5">
        {USAGE_PARTS.map(([key, label]) => {
          const value = usage[key];
          return (
            <li
              key={key}
              className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-2"
            >
              <span className="text-xs">{label}</span>
              <span className="h-2.5 rounded-sm bg-muted">
                <span
                  className="block h-full rounded-sm"
                  style={{
                    width: `${(value / max) * 100}%`,
                    backgroundColor: USAGE_BAR[key],
                  }}
                />
              </span>
              <span className="text-right font-mono text-xs">
                {value === 0 ? "—" : formatTokens(value)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
