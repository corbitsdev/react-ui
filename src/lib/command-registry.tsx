import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { CommandAction } from "../ui/command.js";

/**
 * Lets a page contribute commands to the palette without the palette importing
 * the page.
 *
 * This exists for one reason: the palette is mounted once at the app root, and
 * the actions worth offering depend on where the user is. Without a registry
 * the root has to import every page's actions, which inverts the dependency and
 * makes the root the thing that changes whenever any page does.
 *
 * It is a `useState` array behind a context — not a plugin system. There are no
 * lifecycle hooks, no priorities, no middleware. A component contributes a list
 * while it is mounted and the list goes away when it unmounts, which is the
 * only rule.
 */

type CommandRegistryValue = {
  readonly actions: readonly CommandAction[];
  readonly setScope: (scope: string, actions: readonly CommandAction[]) => void;
  readonly clearScope: (scope: string) => void;
};

const CommandRegistryContext = createContext<CommandRegistryValue | null>(null);

export function CommandRegistryProvider({
  /** Always-available commands. Contributions are appended after these. */
  base = [],
  children,
}: {
  base?: readonly CommandAction[];
  children: ReactNode;
}) {
  const [scopes, setScopes] = useState<readonly { scope: string; actions: readonly CommandAction[] }[]>([]);

  const value = useMemo<CommandRegistryValue>(
    () => ({
      // Insertion-ordered: base first, then contributions in mount order, so
      // the palette's top rows do not shuffle as pages come and go.
      actions: [...base, ...scopes.flatMap((entry) => entry.actions)],
      setScope: (scope, actions) =>
        setScopes((current) => [...current.filter((entry) => entry.scope !== scope), { scope, actions }]),
      clearScope: (scope) => setScopes((current) => current.filter((entry) => entry.scope !== scope)),
    }),
    [base, scopes],
  );

  return <CommandRegistryContext.Provider value={value}>{children}</CommandRegistryContext.Provider>;
}

/** Every registered command. The palette reads this. */
export function useCommands(): readonly CommandAction[] {
  const context = useContext(CommandRegistryContext);
  if (context === null) {
    throw new Error("No command registry in scope — wrap the tree in <CommandRegistryProvider>.");
  }
  return context.actions;
}

/**
 * Contribute commands for as long as this component is mounted.
 *
 * `scope` is a stable string naming the contributor ("inbox", "run:42"). It is
 * the identity the registry replaces on update and removes on unmount — without
 * it, a re-render would append a second copy of the same commands.
 *
 * Memoise `actions`, or pass a module-level constant. An array literal built in
 * the render body is a new value every render and will re-register in a loop.
 */
export function useRegisterCommands(scope: string, actions: readonly CommandAction[]): void {
  const context = useContext(CommandRegistryContext);
  if (context === null) {
    throw new Error("No command registry in scope — wrap the tree in <CommandRegistryProvider>.");
  }
  const { setScope, clearScope } = context;

  useEffect(() => {
    setScope(scope, actions);
    return () => clearScope(scope);
  }, [scope, actions, setScope, clearScope]);
}
