import { Sparkline } from "../../src/ui/sparkline.js";

export default { title: "Primitives / Sparkline" };

export const Rising = () => (
  <Sparkline values={[4, 6, 5, 8, 12, 11, 15, 19]} summary="Up 19% over 8 days" />
);

export const Flat = () => <Sparkline values={[5, 5, 5, 5, 5]} summary="Flat over 5 days" />;

export const Spiky = () => (
  <Sparkline values={[10, 2, 14, 3, 17, 1, 12]} summary="Volatile over 7 days" />
);
