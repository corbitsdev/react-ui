import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";
import { Button } from "./button.js";

export type RichEmptyStateAction = {
  readonly label: string;
  readonly onClick?: () => void;
  /** Renders the action as a link instead of a button. */
  readonly href?: string;
  /** At most one `primary` per empty state — it is the one suggested way out. */
  readonly variant?: "primary" | "secondary";
};

export type RichEmptyStateProps = {
  readonly icon?: ReactNode;
  /** What is not here, as a statement: "No skills installed yet". */
  readonly title: string;
  /** Why, and what this surface will look like once it is populated. */
  readonly description: ReactNode;
  /** Suggested next steps, rendered as buttons or links. */
  readonly actions?: readonly RichEmptyStateAction[];
  /** Extra controls (e.g. a menu) below the primary actions. */
  readonly footer?: ReactNode;
  readonly className?: string;
};

function ActionControl({ action }: { readonly action: RichEmptyStateAction }) {
  const variant = action.variant === "primary" ? "primary" : "secondary";
  if (action.href !== undefined) {
    return (
      <Button asChild variant={variant} size="md">
        <a href={action.href}>{action.label}</a>
      </Button>
    );
  }
  return (
    <Button type="button" variant={variant} size="md" onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

/**
 * The onboarding-grade empty state: icon, message, and suggested actions on a
 * bordered surface of its own.
 *
 * It is not `EmptyState` — that is the quiet in-list "nothing matched" stack.
 * This one is for a surface that is empty because the user has not started
 * yet, where the empty state *is* the page and has to carry the way in. The
 * icon stays decorative and hidden from assistive tech; the title carries the
 * meaning.
 */
export function RichEmptyState({ icon, title, description, actions, footer, className }: RichEmptyStateProps) {
  return (
    <div
      data-slot="rich-empty-state"
      className={cn(
        "flex flex-col items-center justify-center rounded-[12px] border border-border bg-card px-6 py-10 text-center",
        className,
      )}
    >
      {icon === undefined ? null : (
        <div aria-hidden className="mb-4 grid size-12 place-items-center rounded-[12px] bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-bold tracking-[-0.01em]">{title}</h3>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      {actions !== undefined && actions.length > 0 ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {actions.map((action) => (
            <ActionControl key={action.label} action={action} />
          ))}
        </div>
      ) : null}
      {footer === undefined ? null : <div className="mt-4">{footer}</div>}
    </div>
  );
}
