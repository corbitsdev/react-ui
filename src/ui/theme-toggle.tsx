import { Monitor, Moon, Sun } from "lucide-react";

import { Button, type ButtonProps } from "./button.js";
import { useTheme } from "./theme-provider.js";
import type { ThemeMode } from "../lib/theme.js";

function iconFor(mode: ThemeMode) {
  if (mode === "light") return <Sun />;
  if (mode === "dark") return <Moon />;
  return <Monitor />;
}

function labelFor(mode: ThemeMode): string {
  if (mode === "light") return "Light theme";
  if (mode === "dark") return "Dark theme";
  return "System theme";
}

export type ThemeToggleProps = Omit<
  ButtonProps,
  "onClick" | "children" | "aria-label" | "title"
> & {
  /** Override the accessible name; defaults to the current mode label. */
  readonly label?: string;
};

/**
 * Cycles system → light → dark. Intended for the host identity dock (or any
 * chrome that needs a one-control theme switch). Uses `useTheme`, so it must
 * sit under `ThemeProvider`.
 */
export function ThemeToggle({
  label,
  variant = "ghost",
  size = "sm",
  ...props
}: ThemeToggleProps) {
  const { mode, cycleMode } = useTheme();
  const name = label ?? labelFor(mode);
  return (
    <Button
      {...props}
      type="button"
      variant={variant}
      size={size}
      onClick={cycleMode}
      title={name}
      aria-label={name}
    >
      {iconFor(mode)}
    </Button>
  );
}
