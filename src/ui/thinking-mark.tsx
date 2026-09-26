"use client";

import { useId, type CSSProperties } from "react";
import { cn } from "../lib/utils.js";
import { CORBITS_MARK_PATH } from "./corbits-mark.js";

export type ThinkingVariant = "silk" | "strata" | "echo";

export interface ThinkingMarkProps {
  variant?: ThinkingVariant;
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Decorative animated Corbits mark. Pair with visible text or ThinkingIndicator. */
export function ThinkingMark({ variant = "silk", paused = false, className, style }: ThinkingMarkProps) {
  const id = useId();
  const gradient = `${id}-gradient`;
  const mask = `${id}-mask`;
  return (
    <svg
      viewBox="0 0 100 70"
      width="30"
      height="21"
      aria-hidden="true"
      focusable="false"
      className={cn("inline-block h-auto w-[30px] flex-none overflow-visible", paused && "[&_*]:[animation-play-state:paused]", className)}
      style={style}
    >
      <defs>
        {variant === "echo" ? (
          <radialGradient id={gradient}>
            <stop offset=".38" stopColor="white" stopOpacity="0" />
            <stop offset=".65" stopColor="white" stopOpacity=".65" />
            <stop offset=".9" stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
        ) : (
          <linearGradient id={gradient} x1="0" y1="0" x2={variant === "silk" ? "1" : "0"} y2={variant === "silk" ? "0" : "1"}>
            <stop stopColor="white" stopOpacity="0" />
            {variant === "silk" ? <>
              <stop offset=".45" stopColor="white" stopOpacity=".65" />
              <stop offset=".78" stopColor="white" />
            </> : <>
              <stop offset=".25" stopColor="white" />
              <stop offset=".42" stopColor="white" stopOpacity=".7" />
            </>}
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        )}
        <mask id={mask} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="90" style={{ maskType: "luminance" }}>
          {variant === "silk" && <rect className="corbits-thinking-silk [animation:corbits-thinking-sweep_1.45s_cubic-bezier(.22,.05,.38,1)_infinite]" x="-35" y="0" width="48" height="75" fill={`url(#${gradient})`} />}
          {variant === "strata" && <rect className="corbits-thinking-strata [animation:corbits-thinking-rise_3.2s_cubic-bezier(.3,0,.3,1)_infinite]" x="0" y="-12" width="100" height="33" fill={`url(#${gradient})`} />}
          {variant === "echo" && <>
            <circle className="corbits-thinking-echo origin-[62px_9px] [animation:corbits-thinking-wave_3.6s_cubic-bezier(.15,.3,.3,1)_infinite]" cx="62" cy="9" r="80" fill={`url(#${gradient})`} />
            {/* The delay lives inside the shorthand — a separate animation-delay
                utility can be reset by the shorthand's own emission order. */}
            <circle className="corbits-thinking-echo origin-[62px_9px] motion-reduce:hidden [animation:corbits-thinking-wave_3.6s_cubic-bezier(.15,.3,.3,1)_-1.8s_infinite]" cx="62" cy="9" r="80" fill={`url(#${gradient})`} />
          </>}
        </mask>
      </defs>
      <g className="fill-thinking-base" opacity=".7">
        <path d={CORBITS_MARK_PATH} transform="translate(-2.3 -15) scale(.213)" />
      </g>
      <g className="fill-primary" mask={`url(#${mask})`}>
        <path d={CORBITS_MARK_PATH} transform="translate(-2.3 -15) scale(.213)" />
      </g>
    </svg>
  );
}
