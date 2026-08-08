import { workflowScopeLabel, type WorkflowScope } from "../lib/workflow-registry.js";
import { Badge } from "./badge.js";

export type ScopePillProps = {
  readonly scope: WorkflowScope;
  /** Overrides the default "Just me" / "Everyone" wording. */
  readonly label?: string;
  readonly className?: string;
};

/** Who a workflow row belongs to. `tenant` gets the info tone so it reads as
 * shared infrastructure; `personal` gets the accent tone that marks "yours"
 * everywhere else in the registry. */
export function ScopePill({ scope, label, className }: ScopePillProps) {
  return (
    <Badge tone={scope === "tenant" ? "info" : "accent"} className={className}>
      {label ?? workflowScopeLabel(scope)}
    </Badge>
  );
}
