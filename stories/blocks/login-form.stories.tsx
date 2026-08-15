import { LoginForm } from "../../src/blocks/login/login-form.js";

export default { title: "Blocks / Login Form" };

export const SignIn = () => <LoginForm onSubmit={() => {}} />;

export const SignUp = () => <LoginForm mode="sign-up" heading="Create your account" onSubmit={() => {}} />;

export const SignUpBusy = () => <LoginForm mode="sign-up" heading="Create your account" onSubmit={() => {}} busy />;

export const WithProviders = () => (
  <LoginForm
    mode="sign-up"
    heading="Create your account"
    onSubmit={() => {}}
    providers={[
      { id: "google", label: "Continue with Google" },
      { id: "github", label: "Continue with GitHub" },
    ]}
  />
);

export const WithError = () => (
  <LoginForm onSubmit={() => {}} error="That email and password don't match." />
);
