import { ConfirmButton } from "../../src/ui/confirm-button.js";

export default { title: "Primitives / Confirm button" };

export const Basic = () => (
  <ConfirmButton onConfirm={() => alert("Revoked")}>Revoke access</ConfirmButton>
);

// `defaultArmed` only seeds the initial state (uncontrolled), so this shows
// the confirming label and destructive variant without simulating a click.
export const Armed = () => (
  <ConfirmButton onConfirm={() => alert("Revoked")} defaultArmed>
    Revoke access
  </ConfirmButton>
);
