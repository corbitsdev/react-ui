import type { ReactNode } from "react";

import type { ToolPart } from "../lib/chat-message.js";
import { cn } from "../lib/utils.js";

export type ProviderMarkProps = {
  /** Provider key: `slack`, `linear`, `github`. Shown as a monogram if no logo. */
  readonly provider: string;
  /**
   * The provider's brand mark, supplied by the host.
   *
   * This registry ships no third-party logos. Trademarks are not ours to
   * redistribute, and an app that wants real marks has its own source for them
   * — a brand API, a licensed icon set, its own SVGs. So the slot is here and
   * the artwork is not, and the monogram means the fallback is never a blank
   * square.
   */
  readonly logo?: ReactNode;
  readonly size?: "sm" | "md";
  readonly className?: string;
};

const SIZE_CLASS = {
  sm: "size-4 text-[8px]",
  md: "size-6 text-[10px]",
} as const;

/** Which service an action goes through. */
export function ProviderMark({ provider, logo, size = "sm", className }: ProviderMarkProps) {
  const label = provider.charAt(0).toUpperCase() + provider.slice(1);

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-sm bg-muted font-semibold text-muted-foreground",
        SIZE_CLASS[size],
        className,
      )}
    >
      {logo ?? provider.slice(0, 2).toUpperCase()}
    </span>
  );
}

/**
 * The provider marker for a tool call in a transcript.
 *
 * The provider is read off the tool id's `provider__operation` prefix — the
 * same convention `toolLabel` uses — so a tool with no prefix is local and gets
 * no marker rather than a guessed one.
 */
export function ToolProviderMark({
  part,
  logo,
  className,
}: {
  part: ToolPart;
  logo?: ReactNode;
  className?: string;
}) {
  const [provider, ...rest] = part.toolName.split("__");
  if (rest.length === 0 || provider === undefined || provider === "") return null;
  return <ProviderMark provider={provider} logo={logo} className={className} />;
}
