import { AuthLayout } from "../../src/blocks/login/auth-layout.js";
import { DitherBackground } from "../../src/ui/dither-background.js";
import { DitherCanvas } from "../../src/ui/dither-canvas.js";
import { LoginForm } from "../../src/blocks/login/login-form.js";

export default { title: "Blocks / Auth Layout" };

export const NoPanel = () => (
  <AuthLayout brand="Acme">
    <LoginForm onSubmit={() => {}} />
  </AuthLayout>
);

export const WithDitherCanvasPanel = () => (
  <AuthLayout brand="Acme" panel={<DitherCanvas className="absolute inset-0" />}>
    <LoginForm onSubmit={() => {}} />
  </AuthLayout>
);

export const WithDitherBackgroundPanel = () => (
  <AuthLayout
    brand="Acme"
    panel={<DitherBackground className="absolute inset-0" src="https://picsum.photos/seed/auth-panel/1200/1600" />}
  >
    <LoginForm mode="sign-up" heading="Create your account" onSubmit={() => {}} />
  </AuthLayout>
);
