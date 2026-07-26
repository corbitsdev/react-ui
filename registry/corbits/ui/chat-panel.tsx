import type { ReactNode } from "react";

import { agentInitials, type AgentIdentity } from "@/registry/corbits/lib/chat-message";
import { cn } from "@/registry/corbits/lib/utils";

/**
 * The chat surface's frame: who you are talking to, the transcript, and the
 * composer.
 *
 * Parts rather than a `messages`/`onSend` mega-component, because the same
 * frame carries a full-page conversation, a docked bar and a floating panel,
 * and each wants something different in the header — a thread switcher here, a
 * close button there. Composition is what makes one frame serve three shells.
 */
export function ChatPanel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chat-panel"
      className={cn("flex min-h-0 flex-1 flex-col bg-background text-foreground", className)}
      {...props}
    />
  );
}

export function ChatPanelHeader({
  identity,
  children,
  className,
  ...props
}: React.ComponentProps<"header"> & { identity: AgentIdentity }) {
  return (
    <header
      data-slot="chat-panel-header"
      className={cn("flex shrink-0 items-center gap-2.5 border-b border-border px-4 py-3", className)}
      {...props}
    >
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground"
      >
        {agentInitials(identity)}
      </span>
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-sm font-semibold">{identity.name}</p>
        {identity.tagline === undefined ? null : (
          <p className="truncate text-xs text-muted-foreground">{identity.tagline}</p>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">{children}</div>
    </header>
  );
}

/** The composer area: quick replies, the input, anything else pinned to the bottom. */
export function ChatPanelFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      data-slot="chat-panel-footer"
      className={cn("flex shrink-0 flex-col gap-2 border-t border-border p-3", className)}
    >
      {children}
    </div>
  );
}
