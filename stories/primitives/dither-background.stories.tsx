import { DitherBackground } from "../../src/ui/dither-background.js";

export default { title: "Primitives / Dither Background" };

export const Default = () => (
  <div className="h-96 w-full max-w-xl overflow-hidden rounded-lg">
    <DitherBackground src="https://picsum.photos/seed/dither-background/1200/900" />
  </div>
);

export const CoarseGrain = () => (
  <div className="h-96 w-full max-w-xl overflow-hidden rounded-lg">
    <DitherBackground cell={8} levels={2} src="https://picsum.photos/seed/dither-coarse/1200/900" />
  </div>
);

export const NoWarp = () => (
  <div className="h-96 w-full max-w-xl overflow-hidden rounded-lg">
    <DitherBackground warp={false} src="https://picsum.photos/seed/dither-static/1200/900" />
  </div>
);
