import { ConfirmButton } from "../../src/ui/confirm-button.js";

export default { title: "Primitives / Confirm button" };

export const Basic = () => (
  <ConfirmButton onConfirm={() => alert("Revoked")}>Revoke access</ConfirmButton>
);
