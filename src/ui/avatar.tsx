import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type AvatarTone = "neutral" | "agent" | "agent2" | "agent3";

export type AvatarProps = {
  /** One or two characters shown when no image is provided. */
  readonly initials: string;
  readonly label: string;
  readonly tone?: AvatarTone;
  readonly size?: "sm" | "md" | "lg";
  /** Tenant monogram badge overlaid on the corner. */
  readonly tenantMonogram?: string;
  readonly className?: string;
};

const SIZE_CLASS = {
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
} as const;

const TONE_CLASS: Record<AvatarTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  agent: "bg-primary text-primary-foreground",
  agent2: "bg-accent text-accent-foreground",
  agent3: "bg-success text-success-foreground",
};

const BADGE_SIZE = {
  sm: "size-3 text-[7px]",
  md: "size-3.5 text-[8px]",
  lg: "size-4 text-[9px]",
} as const;

/**
 * Initials avatar with optional tenant monogram badge. Images are
 * intentionally unsupported here: identity headers should not flash or
 * depend on third-party avatar hosts.
 */
export function Avatar({
  initials,
  label,
  tone = "neutral",
  size = "md",
  tenantMonogram,
  className,
}: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center font-bold uppercase",
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      )}
    >
      <span aria-hidden>{initials.slice(0, 2)}</span>
      {tenantMonogram === undefined ? null : (
        <span
          aria-hidden
          className={cn(
            "absolute -right-0.5 -bottom-0.5 inline-flex items-center justify-center border border-background bg-muted font-bold uppercase text-muted-foreground",
            BADGE_SIZE[size],
          )}
        >
          {tenantMonogram.slice(0, 1)}
        </span>
      )}
    </span>
  );
}

export type AvatarStackItem = {
  readonly id: string;
  readonly initials: string;
  readonly label: string;
  readonly tone?: AvatarTone;
  readonly tenantMonogram?: string;
};

export type AvatarStackProps = {
  readonly items: readonly AvatarStackItem[];
  /** Cap visible avatars; remainder becomes a +N chip. */
  readonly max?: number;
  readonly size?: "sm" | "md";
  readonly className?: string;
};

/**
 * Overlapping avatar stack for thread participants and channel members.
 */
export function AvatarStack({ items, max = 4, size = "sm", className }: AvatarStackProps) {
  const visible = items.slice(0, max);
  const overflow = items.length - visible.length;
  return (
    <span className={cn("inline-flex items-center", className)} role="group" aria-label="Participants">
      {visible.map((item, index) => (
        <Avatar
          key={item.id}
          initials={item.initials}
          label={item.label}
          {...(item.tone === undefined ? {} : { tone: item.tone })}
          {...(item.tenantMonogram === undefined ? {} : { tenantMonogram: item.tenantMonogram })}
          size={size}
          className={cn("ring-1 ring-background", index > 0 && "-ml-1.5")}
        />
      ))}
      {overflow <= 0 ? null : (
        <span
          className={cn(
            "inline-flex items-center justify-center bg-muted font-mono font-semibold text-muted-foreground ring-1 ring-background",
            SIZE_CLASS[size],
            visible.length > 0 && "-ml-1.5",
          )}
          aria-label={`${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}

export type AvatarStackSlot = ReactNode;
