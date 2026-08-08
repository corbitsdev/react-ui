import { useState } from "react";

import { Button } from "../../src/ui/button.js";
import { LibraryPageHeader } from "../../src/ui/library-page-header.js";
import { LibrarySearchInput } from "../../src/ui/library-search-input.js";
import { ViewToggle, type ViewMode } from "../../src/ui/view-toggle.js";

export default { title: "Primitives / Library page header" };

function CatalogHeader() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ViewMode>("grid");
  return (
    <LibraryPageHeader title="Skills" count={24} subtitle="Everything your agents know how to do.">
      <LibrarySearchInput label="Search skills" value={query} onChange={setQuery} />
      <ViewToggle mode={mode} onChange={setMode} />
      <Button size="sm">New skill</Button>
    </LibraryPageHeader>
  );
}

export const Catalog = () => <CatalogHeader />;

function DenseHeader() {
  const [query, setQuery] = useState("");
  return (
    <LibraryPageHeader title="Chats" titleSize="sm" count={112}>
      <LibrarySearchInput label="Search chats" value={query} onChange={setQuery} variant="ghost" />
    </LibraryPageHeader>
  );
}

export const Dense = () => <DenseHeader />;
