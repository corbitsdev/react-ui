import { computeDelta } from "../../src/lib/metrics.js";
import { DeltaBadge } from "../../src/ui/delta-badge.js";
import { Heatmap } from "../../src/ui/heatmap.js";
import { StatGrid, StatGridItem } from "../../src/ui/stat-grid.js";
import { TokenMosaic } from "../../src/ui/token-mosaic.js";

export default { title: "Primitives / Viz" };

const days = Array.from({ length: 42 }, (_, index) => ({
  date: `2026-06-${String((index % 30) + 1).padStart(2, "0")}`,
  value: [0, 2, 5, 0, 9, 3, 1][index % 7] ?? 0,
}));

export const HeatmapStrip = () => <Heatmap days={days} label="Runs per day" />;

export const Mosaic = () => (
  <TokenMosaic
    label="Token usage by class"
    parts={[
      { label: "Input", value: 1_840_000 },
      { label: "Output", value: 420_000 },
      { label: "Cache read", value: 2_900_000 },
      { label: "Cache write", value: 610_000 },
    ]}
  />
);

export const Deltas = () => (
  <StatGrid columns={3}>
    <StatGridItem label="Turns" value="1,284" delta={<DeltaBadge delta={computeDelta(1284, 1100)} upIsGood />} />
    <StatGridItem
      label="Tool errors"
      value="37"
      danger
      delta={<DeltaBadge delta={computeDelta(37, 21)} upIsGood={false} />}
    />
    <StatGridItem label="Tokens" value="4.2M" delta={<DeltaBadge delta={computeDelta(42, null)} upIsGood />} />
  </StatGrid>
);
