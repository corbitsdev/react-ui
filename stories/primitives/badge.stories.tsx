import { Badge } from "../../src/ui/badge.js";

export default { title: "Primitives / Badge" };

export const Tones = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge tone="neutral">Draft</Badge>
    <Badge tone="accent">Personal</Badge>
    <Badge tone="info">Everyone</Badge>
    <Badge tone="success">Delivered</Badge>
    <Badge tone="danger">Failed</Badge>
  </div>
);
