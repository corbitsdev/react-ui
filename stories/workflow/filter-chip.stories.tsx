import { useState } from "react";

import { FilterChip } from "../../src/ui/filter-chip.js";

export default { title: "Workflow / Filter chip" };

export const SelectedAndUnselected = () => (
  <div className="flex flex-wrap items-center gap-2">
    <FilterChip selected count={12}>
      Live
    </FilterChip>
    <FilterChip count={4}>Scheduled</FilterChip>
    <FilterChip>Needs you</FilterChip>
  </div>
);

export const Interactive = () => {
  const [selected, setSelected] = useState("live");
  const facets = [
    { id: "live", label: "Live", count: 12 },
    { id: "scheduled", label: "Scheduled", count: 4 },
    { id: "needs-you", label: "Needs you", count: 2 },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {facets.map((facet) => (
        <FilterChip
          key={facet.id}
          selected={selected === facet.id}
          count={facet.count}
          onClick={() => setSelected(facet.id)}
        >
          {facet.label}
        </FilterChip>
      ))}
    </div>
  );
};
