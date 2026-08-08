import { InspectorEmpty } from "../../src/ui/inspector-shell.js";
import { ScheduleInspectorView } from "../../src/ui/schedule-inspector.js";

export default { title: "Workflow / Schedule inspector" };

export const Active = () => (
  <div className="h-[420px] w-96">
    <ScheduleInspectorView
      enabled
      scope="tenant"
      title="Weekly metrics summary"
      description="Posts the last 7 days of usage to #leadership every Monday."
      cadence="Every Monday at 8:00 AM"
      next="Mon, 8:00 AM"
      last="Last Monday"
    />
  </div>
);

export const Paused = () => (
  <div className="h-[420px] w-96">
    <ScheduleInspectorView
      enabled={false}
      scope="personal"
      title="Daily inbox triage"
      cadence="Every weekday at 7:30 AM"
      last="Friday"
    />
  </div>
);

export const Empty = () => (
  <div className="h-[420px] w-96">
    <ScheduleInspectorView
      enabled
      scope="personal"
      title="Schedule"
      cadence=""
      empty={<InspectorEmpty title="No schedule selected" description="Pick a schedule from the list to see its details here." />}
    />
  </div>
);
