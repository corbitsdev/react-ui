import type { ReactNode } from "react";

import { toSafeHref } from "../lib/url.js";
import { cn } from "../lib/utils.js";
import { Avatar, type AvatarTone } from "./avatar.js";
import { Badge, type BadgeTone } from "./badge.js";
import { Button } from "./button.js";

export type ProfileCardAction = {
  readonly id: string;
  readonly label: string;
  readonly onClick?: () => void;
  readonly tone?: "primary" | "outline";
};

export type ProfileCardChannel = {
  readonly id: string;
  readonly name: string;
  readonly href?: string;
};

export type ProfileCardSkill = {
  readonly id: string;
  readonly name: string;
  readonly href?: string;
};

export type ProfileCardProps = {
  readonly name: string;
  readonly initials: string;
  readonly subtitle?: string;
  readonly statusLabel?: string;
  readonly statusTone?: BadgeTone;
  readonly avatarTone?: AvatarTone;
  readonly tenantMonogram?: string;
  readonly actions?: readonly ProfileCardAction[];
  readonly sharedChannels?: readonly ProfileCardChannel[];
  readonly pinnedSkills?: readonly ProfileCardSkill[];
  readonly footer?: ReactNode;
  readonly className?: string;
};

/**
 * Canvas profile card: hero identity, status, action chips, shared
 * channels, and pinned skills. Deep-links are plain hrefs so the host
 * router owns navigation.
 */
export function ProfileCard({
  name,
  initials,
  subtitle,
  statusLabel,
  statusTone = "neutral",
  avatarTone = "neutral",
  tenantMonogram,
  actions = [],
  sharedChannels = [],
  pinnedSkills = [],
  footer,
  className,
}: ProfileCardProps) {
  return (
    <article
      data-slot="profile-card"
      className={cn("flex flex-col gap-4 border border-border bg-card p-4", className)}
    >
      <header className="flex items-start gap-3">
        <Avatar
          initials={initials}
          label={name}
          tone={avatarTone}
          size="lg"
          {...(tenantMonogram === undefined ? {} : { tenantMonogram })}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold">{name}</h2>
            {statusLabel === undefined ? null : <Badge tone={statusTone}>{statusLabel}</Badge>}
          </div>
          {subtitle === undefined ? null : (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </header>

      {actions.length === 0 ? null : (
        <div className="flex flex-wrap gap-1.5">
          {actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              size="sm"
              variant={action.tone === "primary" ? "primary" : "outline"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {sharedChannels.length === 0 ? null : (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Shared channels
          </h3>
          <ul className="flex flex-col gap-1">
            {sharedChannels.map((channel) => {
              const href = toSafeHref(channel.href);
              return (
                <li key={channel.id}>
                  {href === undefined ? (
                    <span className="text-sm">#{channel.name}</span>
                  ) : (
                    <a href={href} className="text-sm text-foreground hover:underline">
                      #{channel.name}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {pinnedSkills.length === 0 ? null : (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Pinned skills
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {pinnedSkills.map((skill) => {
              const href = toSafeHref(skill.href);
              return href === undefined ? (
                <Badge key={skill.id} tone="neutral">
                  {skill.name}
                </Badge>
              ) : (
                <a key={skill.id} href={href}>
                  <Badge tone="neutral">{skill.name}</Badge>
                </a>
              );
            })}
          </ul>
        </section>
      )}

      {footer === undefined ? null : <footer className="border-t border-border pt-3">{footer}</footer>}
    </article>
  );
}
