import { useState } from "react";

import { Pagination } from "../../src/ui/pagination.js";

export default { title: "Primitives / Pagination" };

export const Interactive = () => {
  const [page, setPage] = useState(1);
  return <Pagination page={page} totalPages={8} total={193} onPageChange={setPage} />;
};

export const SinglePageRendersNothing = () => (
  <div className="text-sm text-muted-foreground">
    <Pagination page={1} totalPages={1} onPageChange={() => {}} />
    Nothing renders above — a list that fits on one page shows no pagination chrome.
  </div>
);
