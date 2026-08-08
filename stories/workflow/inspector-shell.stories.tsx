import {
  InspectorEmpty,
  InspectorHeader,
  InspectorKv,
  InspectorShell,
} from "../../src/ui/inspector-shell.js";
import { ScopePill } from "../../src/ui/scope-pill.js";
import { StatusChip } from "../../src/ui/status-chip.js";

export default { title: "Workflow / Inspector shell" };

export const WithContent = () => (
  <div className="h-96 w-80">
    <InspectorShell
      header={
        <InspectorHeader
          eyebrow={
            <>
              <StatusChip tone="running" label="Running" />
              <ScopePill scope="personal" />
            </>
          }
          title="Nightly digest to Sales"
        />
      }
    >
      <InspectorKv
        rows={[
          { label: "Started", value: "8:02 PM" },
          { label: "Elapsed", value: "00:42" },
          { label: "Run id", value: "run_9f2a1c", mono: true },
        ]}
      />
    </InspectorShell>
  </div>
);

export const Empty = () => (
  <div className="h-96 w-80">
    <InspectorShell empty={<InspectorEmpty title="No run selected" description="Pick a run from the list to see its details here." />} />
  </div>
);
