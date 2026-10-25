import { TraceReading } from "../../../src/blocks/observability/trace-reading.js";
import { trace } from "../fixtures.js";

export default { title: "Observability / Views / Reading" };

const review = trace("wf-review");
const editor = trace("ag-editor");

export const Review = () => (
  <div className="h-[640px] border border-border">
    <TraceReading trace={review} />
  </div>
);

export const Editor = () => (
  <div className="h-[640px] border border-border">
    <TraceReading trace={editor} />
  </div>
);
