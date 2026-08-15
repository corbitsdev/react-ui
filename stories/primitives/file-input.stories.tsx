import { FileInput } from "../../src/ui/file-input.js";

export default { title: "Primitives / File input" };

// No story for the dragging state: it is driven by native `dragenter`/`dragover`
// DOM events that jsdom and Ladle's static canvas cannot simulate faithfully,
// and there is no prop to force it. Verify that state by hand when touching it.

export const Basic = () => (
  <FileInput onFiles={(files) => alert(`${files.length} file(s) selected`)} className="max-w-sm" />
);

export const Disabled = () => (
  <FileInput onFiles={() => {}} disabled hint="Uploads are paused" className="max-w-sm" />
);
