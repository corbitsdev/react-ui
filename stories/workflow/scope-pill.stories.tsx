import { ScopePill } from "../../src/ui/scope-pill.js";

export default { title: "Workflow / Scope pill" };

export const PersonalAndTenant = () => (
  <div className="flex flex-wrap items-center gap-2">
    <ScopePill scope="personal" />
    <ScopePill scope="tenant" />
  </div>
);
