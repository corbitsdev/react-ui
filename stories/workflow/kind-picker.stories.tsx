import { useState } from "react";

import { KindPickerCard, KindPickerFilters, KindPickerList, KindPickerSearch } from "../../src/ui/kind-picker.js";
import type { KindPickerItem } from "../../src/lib/workflow-registry.js";

export default { title: "Workflow / Kind picker" };

const ITEMS: KindPickerItem[] = [
  {
    id: "invoice-reminders",
    label: "Invoice reminders",
    description: "Chases every invoice more than 30 days overdue.",
    category: "finance",
    categoryLabel: "Finance",
  },
  {
    id: "vendor-renewal",
    label: "Vendor renewal review",
    description: "Flags vendor contracts renewing in the next 30 days.",
    category: "finance",
    categoryLabel: "Finance",
    alreadyOn: true,
  },
  {
    id: "inbox-triage",
    label: "Daily inbox triage",
    description: "Sorts and labels new mail every weekday morning.",
    category: "productivity",
    categoryLabel: "Productivity",
  },
];

export const Card = () => <KindPickerCard item={ITEMS[1]!} selected />;

export const SearchAndFilters = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>();
  return (
    <div className="flex w-96 flex-col gap-3">
      <KindPickerSearch value="" onChange={() => {}} />
      <KindPickerFilters
        categories={[
          { id: "finance", label: "Finance" },
          { id: "productivity", label: "Productivity" },
        ]}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
      <KindPickerList items={ITEMS} selectedId="vendor-renewal" />
    </div>
  );
};

export const NoResults = () => (
  <div className="w-96">
    <KindPickerList items={[]} />
  </div>
);
