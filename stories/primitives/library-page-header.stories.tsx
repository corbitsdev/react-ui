import { useState } from "react";

import { Button } from "../../src/ui/button.js";
import { LibraryPageHeader } from "../../src/ui/library-page-header.js";
import { ViewToggle, type ViewMode } from "../../src/ui/view-toggle.js";

export default { title: "Primitives / Library page header" };

function CatalogHeader() {
  const [mode, setMode] = useState<ViewMode>("grid");
  return (
    <LibraryPageHeader
      title="Skills"
      count={24}
      subtitle="Everything your agents know how to do."
    >
      <ViewToggle mode={mode} onChange={setMode} />
      <Button size="sm">New skill</Button>
    </LibraryPageHeader>
  );
}

export const Catalog = () => <CatalogHeader />;

export const Dense = () => (
  <LibraryPageHeader title="Chats" titleSize="sm" count={112}>
    <Button size="sm" variant="ghost">
      New chat
    </Button>
  </LibraryPageHeader>
);
