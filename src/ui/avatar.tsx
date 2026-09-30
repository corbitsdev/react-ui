import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type AvatarTone = "neutral" | "agent" | "agent2" | "agent3";

export type AvatarShape = "circle" | "square";
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarStatus = "working" | "ready" | "idle";

export type AvatarProps = {
  /** One or two characters shown when no image is provided. */
  readonly initials: string;
  readonly label: string;
  readonly tone?: AvatarTone;
  readonly size?: AvatarSize;
  /**
   * `circle` is fully round; `square` rounds by `--avatar-radius` (defaults to
   * `--radius`). Omitted keeps the unrounded default.
   */
  readonly shape?: AvatarShape;
  /** Corner dot marking state; the label gains the state for assistive tech. */
  readonly status?: AvatarStatus;
  /** Orange arc circling the avatar. Static under reduced motion. */
  readonly orbit?: boolean;
  /** Tenant monogram badge overlaid on the corner. */
  readonly tenantMonogram?: string;
  readonly className?: string;
};

const SIZE_CLASS: Record<AvatarSize, string> = {
  xs: "size-5 text-[8px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-14 text-lg",
};

const SHAPE_CLASS: Record<AvatarShape, string> = {
  circle: "rounded-full",
  square: "rounded-[var(--avatar-radius,var(--radius))]",
};

const STATUS_CLASS: Record<AvatarStatus, string> = {
  working: "bg-primary-emphasis",
  ready: "bg-ok",
  idle: "bg-muted-foreground",
};

const DOT_SIZE: Record<AvatarSize, string> = {
  xs: "size-1.5",
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3",
  xl: "size-3.5",
};

const TONE_CLASS: Record<AvatarTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  agent: "bg-primary text-primary-foreground",
  agent2: "bg-accent text-accent-foreground",
  agent3: "bg-success text-success-foreground",
};

const BADGE_SIZE: Record<AvatarSize, string> = {
  xs: "size-2.5 text-[6px]",
  sm: "size-3 text-[7px]",
  md: "size-3.5 text-[8px]",
  lg: "size-4 text-[9px]",
  xl: "size-5 text-[10px]",
};

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
  shape,
  status,
  orbit = false,
  tenantMonogram,
  className,
}: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={status === undefined ? label : `${label}, ${status}`}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center font-bold uppercase",
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        shape !== undefined && SHAPE_CLASS[shape],
        className,
      )}
    >
      {orbit ? <span aria-hidden className="corbits-avatar-orbit" /> : null}
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
      {status === undefined ? null : (
        <span
          aria-hidden
          className={cn(
            "absolute -right-0.5 -bottom-0.5 rounded-full ring-2 ring-background",
            DOT_SIZE[size],
            STATUS_CLASS[status],
            tenantMonogram !== undefined && "right-auto -left-0.5",
          )}
        />
      )}
    </span>
  );
}

export type AvatarStackItem = {
  readonly id: string;
  readonly initials: string;
  readonly label: string;
  readonly tone?: AvatarTone;
  readonly shape?: AvatarShape;
  readonly status?: AvatarStatus;
  readonly orbit?: boolean;
  readonly tenantMonogram?: string;
};

export type AvatarStackProps = {
  readonly items: readonly AvatarStackItem[];
  /** Cap visible avatars; remainder becomes a +N chip. */
  readonly max?: number;
  readonly size?: AvatarSize;
  /** Default shape for every item; an item's own `shape` wins. */
  readonly shape?: AvatarShape;
  readonly className?: string;
};

/**
 * Overlapping avatar stack for thread participants and channel members.
 */
export function AvatarStack({
  items,
  max = 4,
  size = "sm",
  shape,
  className,
}: AvatarStackProps) {
  const visible = items.slice(0, max);
  const overflow = items.length - visible.length;
  return (
    <span
      className={cn("inline-flex items-center", className)}
      role="group"
      aria-label="Participants"
    >
      {visible.map((item, index) => (
        <Avatar
          key={item.id}
          initials={item.initials}
          label={item.label}
          {...(item.tone === undefined ? {} : { tone: item.tone })}
          {...(item.shape === undefined && shape === undefined
            ? {}
            : { shape: item.shape ?? shape })}
          {...(item.status === undefined ? {} : { status: item.status })}
          {...(item.orbit === undefined ? {} : { orbit: item.orbit })}
          {...(item.tenantMonogram === undefined
            ? {}
            : { tenantMonogram: item.tenantMonogram })}
          size={size}
          className={cn("ring-1 ring-background", index > 0 && "-ml-1.5")}
        />
      ))}
      {overflow <= 0 ? null : (
        <span
          className={cn(
            "inline-flex items-center justify-center bg-muted font-mono font-semibold text-muted-foreground ring-1 ring-background",
            shape !== undefined && SHAPE_CLASS[shape],
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
