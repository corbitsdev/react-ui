import { Button } from "../../src/ui/button.js";
import { toast, Toaster } from "../../src/ui/toast.js";

export default { title: "Primitives / Toast" };

/** Plain-text mutation confirmations. One toast at a time: firing another
 * while one is visible replaces the message and restarts the timer. */
export const Confirmations = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Toaster />
    <Button variant="outline" onClick={() => toast("Channel created")}>
      Channel created
    </Button>
    <Button variant="outline" onClick={() => toast("Pinned Deploy notes")}>
      Pinned
    </Button>
    <Button variant="outline" onClick={() => toast("Settings saved")}>
      Settings saved
    </Button>
  </div>
);
