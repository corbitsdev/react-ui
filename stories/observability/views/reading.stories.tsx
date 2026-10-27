import { TraceReading } from "../../../src/blocks/observability/trace-reading.js";
import { trace } from "../fixtures.js";

export default { title: "Observability / Views / Reading" };

const review = trace("wf-review");
const editor = trace("ag-editor");

export const Review = () => (
  <div className="flex h-[640px] flex-col overflow-hidden border border-border">
    <TraceReading trace={review} />
  </div>
);

export const Editor = () => (
  <div className="flex h-[640px] flex-col overflow-hidden border border-border">
    <TraceReading trace={editor} />
  </div>
);
