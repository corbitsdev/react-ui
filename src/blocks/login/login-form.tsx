import { useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../../lib/utils.js";
import { Button } from "../../ui/button.js";
import { Input } from "../../ui/input.js";

export type AuthProvider = {
  /** Passed straight back to `onProvider`. Yours to define. */
  readonly id: string;
  /** The whole button label: "Continue with Google". */
  readonly label: string;
  /**
   * The provider's mark, if you have it.
   *
   * This registry ships no third-party logos — trademarks are not ours to
   * redistribute, and any app that wants real marks already has a licensed
   * source for them. The slot is here; the artwork is yours.
   */
  readonly icon?: ReactNode;
};

export type LoginFormProps = {
  readonly heading?: string;
  /** Social / SSO options. Empty renders none, and no divider either. */
  readonly providers?: readonly AuthProvider[];
  readonly onProvider?: (id: string) => void;
  /** Omit to render an SSO-only page with no email fields at all. */
  readonly onSubmit?: (credentials: { readonly email: string; readonly password: string }) => void;
  /** True while a sign-in is in flight. Disables every control. */
  readonly busy?: boolean;
  /** A failure to show. Announced, not just drawn. */
  readonly error?: string | null;
  /** Below the form — a "forgot password" link, terms copy. */
  readonly footer?: ReactNode;
  readonly className?: string;
};

/**
 * The sign-in form. It renders and reports; it never authenticates.
 *
 * Every outcome leaves through a callback and every state arrives as a prop, so
 * the block has no idea what a session is. That is what makes it installable:
 * an auth block that imports a client is a block you have to gut before you can
 * use it with yours.
 *
 * The error is `role="alert"`. A sign-in failure that is only drawn is a
 * sign-in failure some users never learn about — they submit, nothing appears
 * to happen, and they submit again. It is `aria-live="assertive"` precisely
 * because interrupting is correct here.
 *
 * `autoComplete="email"` and `"current-password"` are not decoration: they are
 * what lets a password manager fill this form, and a sign-in form password
 * managers cannot fill pushes people toward worse passwords.
 *
 * The submit button reads "Signing in…" while busy rather than swapping to a
 * spinner. The label is the status, so it is announced by the same mechanism
 * that announces the button.
 */
export function LoginForm({
  heading = "Welcome back",
  providers = [],
  onProvider,
  onSubmit,
  busy = false,
  error = null,
  footer,
  className,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <h1 className="text-3xl leading-none font-semibold tracking-tight text-balance">{heading}</h1>

      {error === null ? null : (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-destructive px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {onSubmit === undefined ? null : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ email, password });
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Email
            <Input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
              required
              className="h-11"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Password
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              required
              className="h-11"
            />
          </label>
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Signing in…" : "Continue"}
          </Button>
        </form>
      )}

      {onSubmit === undefined || providers.length === 0 ? null : (
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-px flex-1 bg-border" />
          <span className="text-xs tracking-wider text-muted-foreground uppercase">or</span>
          <span aria-hidden className="h-px flex-1 bg-border" />
        </div>
      )}

      {providers.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          variant="outline"
          size="lg"
          disabled={busy}
          onClick={() => onProvider?.(provider.id)}
        >
          {provider.icon}
          {provider.label}
        </Button>
      ))}

      {footer === undefined ? null : <div className="text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}
