import { useState } from "react";

import { Button } from "../../src/ui/button.js";
import { MicPermissionDialog } from "../../src/ui/mic-permission-dialog.js";

export default { title: "Primitives / Mic permission dialog" };

export const Default = () => {
  const [open, setOpen] = useState(true);
  return (
    <div className="p-4">
      <Button onClick={() => setOpen(true)}>Reopen</Button>
      <MicPermissionDialog
        open={open}
        onOpenChange={setOpen}
        title="Microphone access needed"
        detail="Dictation needs microphone and speech recognition permission. Open Sound settings to allow it."
        actionLabel="Open Sound settings"
        onAction={() => setOpen(false)}
      />
    </div>
  );
};

export const ActionFailed = () => {
  const [open, setOpen] = useState(true);
  return (
    <div className="p-4">
      <Button onClick={() => setOpen(true)}>Reopen</Button>
      <MicPermissionDialog
        open={open}
        onOpenChange={setOpen}
        title="Microphone access needed"
        detail="Dictation needs microphone and speech recognition permission."
        actionLabel="Open Sound settings"
        onAction={() => {}}
        failure="Could not open Sound settings: pane not found."
      />
    </div>
  );
};
