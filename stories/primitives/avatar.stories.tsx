import { Avatar, AvatarStack } from "../../src/ui/avatar.js";

export default { title: "Primitives / Avatar" };

export const Tones = () => (
  <div className="flex items-center gap-3">
    <Avatar initials="NP" label="Noor Patel" tone="neutral" />
    <Avatar initials="AI" label="Agent" tone="agent" />
    <Avatar initials="A2" label="Agent 2" tone="agent2" />
    <Avatar initials="A3" label="Agent 3" tone="agent3" />
  </div>
);

export const Sizes = () => (
  <div className="flex items-center gap-3">
    <Avatar initials="SM" label="Small" size="sm" />
    <Avatar initials="MD" label="Medium" size="md" />
    <Avatar initials="LG" label="Large" size="lg" />
  </div>
);

export const WithTenantMonogram = () => (
  <Avatar initials="NP" label="Noor Patel" tenantMonogram="C" size="lg" />
);

export const Stack = () => (
  <AvatarStack
    items={[
      { id: "1", initials: "NP", label: "Noor Patel" },
      { id: "2", initials: "AI", label: "Agent", tone: "agent" },
      { id: "3", initials: "JD", label: "Jane Doe" },
      { id: "4", initials: "MK", label: "Max King" },
      { id: "5", initials: "TL", label: "Tara Lin" },
    ]}
    max={4}
  />
);
