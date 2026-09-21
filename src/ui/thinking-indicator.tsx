import { cn } from "../lib/utils.js";
import { ThinkingMark, type ThinkingMarkProps } from "./thinking-mark.js";

export interface ThinkingIndicatorProps extends ThinkingMarkProps {
  /** Visible status text, also announced by assistive technology. */
  label?: string;
}

/** A thinking status with Silk, Strata, or Echo motion. Defaults to Silk. */
export function ThinkingIndicator({ label = "Thinking...", className, style, ...markProps }: ThinkingIndicatorProps) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground", className)} style={style}>
      {/* The mountain carries more visual weight below its SVG center. */}
      <ThinkingMark {...markProps} className="-translate-y-[8%]" />
      <span>{label}</span>
    </span>
  );
}
