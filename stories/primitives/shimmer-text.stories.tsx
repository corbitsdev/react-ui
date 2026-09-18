import { ShimmerText } from "../../src/ui/shimmer-text.js";

export default { title: "Primitives / Shimmer text" };

export const Default = () => (
  <div className="p-4 text-sm">
    <ShimmerText>Reading the codebase…</ShimmerText>
  </div>
);

export const AsStatus = () => (
  <div className="p-4 text-sm">
    <ShimmerText role="status">Searching…</ShimmerText>
  </div>
);
