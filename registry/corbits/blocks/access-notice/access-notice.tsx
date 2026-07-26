import type { ReactNode } from "react";

import { cn } from "@/registry/corbits/lib/utils";

export type AccessNoticeProps = {
  readonly title: string;
  /** What is happening and what to do next. Two sentences at most. */
  readonly description: ReactNode;
  /** The way forward — "Contact your administrator", "Sign out". */
  readonly actions?: ReactNode;
  readonly brand?: ReactNode;
  readonly className?: string;
};

/**
 * The page someone lands on when they are signed in but have nothing to see:
 * awaiting an invitation, awaiting approval, removed from the last workspace
 * they had.
 *
 * A distinct surface rather than an empty dashboard, because those states are
 * not emptiness — they are a specific thing that happened, with a specific
 * next step, and rendering them as "no items yet" tells someone to wait when
 * they should be emailing an administrator.
 *
 * `<h1>` inside `<main>`: this is the whole page, not a panel on one. A page
 * whose only content is a notice still needs a document outline, and this is it.
 *
 * No illustration slot. The correct thing here is one sentence saying what to
 * do; artwork on a dead end is decoration on someone's bad moment.
 */
export function AccessNotice({ title, description, actions, brand, className }: AccessNoticeProps) {
  return (
    <main className={cn("flex min-h-svh flex-col bg-background", className)}>
      {brand === undefined ? null : (
        <div className="flex items-center gap-2.5 p-6 text-base font-semibold tracking-tight md:p-8">{brand}</div>
      )}
      <div className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          {actions === undefined ? null : <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>}
        </div>
      </div>
    </main>
  );
}
