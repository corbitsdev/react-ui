import { FileInput } from "../../src/ui/file-input.js";

export default { title: "Primitives / File input" };

export const Basic = () => (
  <FileInput onFiles={(files) => alert(`${files.length} file(s) selected`)} className="max-w-sm" />
);

export const Disabled = () => (
  <FileInput onFiles={() => {}} disabled hint="Uploads are paused" className="max-w-sm" />
);
