import { AuthLayout } from "../../src/blocks/login/auth-layout.js";
import { DitherCanvas } from "../../src/ui/dither-canvas.js";
import { LoginForm } from "../../src/blocks/login/login-form.js";

export default { title: "Blocks / Auth Layout" };

export const NoPanel = () => (
  <AuthLayout brand="Acme">
    <LoginForm onSubmit={() => {}} />
  </AuthLayout>
);

export const WithDitherCanvasPanel = () => (
  <AuthLayout
    brand="Acme"
    panel={<DitherCanvas className="absolute inset-0" />}
  >
    <LoginForm onSubmit={() => {}} />
  </AuthLayout>
);
