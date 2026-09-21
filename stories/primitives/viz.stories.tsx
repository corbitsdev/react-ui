import { StatGrid, StatGridItem } from "../../src/ui/stat-grid.js";
import { TokenMosaic } from "../../src/ui/token-mosaic.js";

export default { title: "Primitives / Viz" };

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

export const Stats = () => (
  <StatGrid columns={3}>
    <StatGridItem label="Turns" value="1,284" />
    <StatGridItem label="Tool errors" value="37" danger />
    <StatGridItem label="Tokens" value="4.2M" />
  </StatGrid>
);
