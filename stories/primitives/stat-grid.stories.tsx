import { StatGrid, StatGridItem } from "../../src/ui/stat-grid.js";

export default { title: "Primitives / Stat grid" };

const TREND = [4, 6, 5, 9, 8, 12, 11, 14, 13, 17, 16, 21];

export const FourUp = () => (
  <StatGrid>
    <StatGridItem label="Turns" value="1,284" sparklineValues={TREND} sparklineLabel="Turns, rising over 12 days" />
    <StatGridItem label="Tool calls" value="9,102" sub="7.1 per turn" />
    <StatGridItem label="Tokens" value="4.2M" sub="62% cache hits" />
    <StatGridItem label="Tool errors" value="37" danger sub="0.4% of calls" />
  </StatGrid>
);

export const Headline = () => (
  <StatGrid columns={3}>
    <StatGridItem label="Active agents" value="12" emphasis sparklineValues={TREND} />
    <StatGridItem label="Runs today" value="86" emphasis />
    <StatGridItem label="Approvals waiting" value="3" emphasis accent />
  </StatGrid>
);

export const Interactive = () => (
  <StatGrid columns={3}>
    <StatGridItem label="Purpose runs" value="128" onClick={() => {}} />
    <StatGridItem label="Running now" value="4" onClick={() => {}} />
    <StatGridItem label="Errored" value="2" danger onClick={() => {}} />
  </StatGrid>
);
