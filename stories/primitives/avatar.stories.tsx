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
    <Avatar initials="XS" label="Extra small" size="xs" />
    <Avatar initials="SM" label="Small" size="sm" />
    <Avatar initials="MD" label="Medium" size="md" />
    <Avatar initials="LG" label="Large" size="lg" />
    <Avatar initials="XL" label="Extra large" size="xl" />
  </div>
);

export const Shapes = () => (
  <div className="flex items-center gap-3">
    <Avatar initials="NP" label="Noor Patel" shape="circle" tone="agent" />
    <Avatar initials="AI" label="Agent" shape="square" tone="agent" />
  </div>
);

export const Statuses = () => (
  <div className="flex items-center gap-4">
    <Avatar
      initials="AI"
      label="Agent"
      shape="square"
      status="working"
      size="lg"
    />
    <Avatar
      initials="AI"
      label="Agent"
      shape="square"
      status="ready"
      size="lg"
    />
    <Avatar
      initials="AI"
      label="Agent"
      shape="square"
      status="idle"
      size="lg"
    />
    <Avatar
      initials="NP"
      label="Noor Patel"
      shape="circle"
      status="ready"
      size="lg"
    />
  </div>
);

export const Orbit = () => (
  <div className="flex items-center gap-4 p-2">
    {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
      <Avatar
        key={size}
        initials="AI"
        label="Agent"
        tone="agent"
        shape="square"
        status="working"
        orbit
        size={size}
      />
    ))}
    <Avatar
      initials="NP"
      label="Noor Patel"
      shape="circle"
      status="working"
      orbit
      size="lg"
    />
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

export const StackWithStatus = () => (
  <AvatarStack
    shape="circle"
    items={[
      { id: "1", initials: "NP", label: "Noor Patel" },
      {
        id: "2",
        initials: "AI",
        label: "Agent",
        tone: "agent",
        shape: "square",
        status: "working",
        orbit: true,
      },
    ]}
  />
);
