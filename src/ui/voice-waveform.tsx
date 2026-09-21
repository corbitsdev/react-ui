import { cn } from "../lib/utils.js";

export type VoiceWaveformProps = {
  /** Recent input levels, 0..1, oldest first. One bar per entry. */
  readonly levels: readonly number[];
  readonly className?: string;
};

/**
 * A bar waveform driven entirely by `levels` — no microphone or audio API
 * here, the consumer's dictation hook owns sampling and passes the numbers
 * in. `aria-hidden`: the state it shows is spoken separately by
 * `DictationStatusLine`.
 *
 * Bar height is an inline `scaleY` transform per frame; the `duration-75`
 * transition is plain CSS, so the theme's global reduced-motion rule already
 * collapses it — no JS-side handling needed here.
 */
export function VoiceWaveform({ levels, className }: VoiceWaveformProps) {
  return (
    <span aria-hidden className={cn("inline-flex h-4 items-center gap-px", className)}>
      {levels.map((level, index) => (
        <i
          key={index}
          className="inline-block h-full w-0.5 origin-center rounded-full bg-current transition-transform duration-75"
          style={{ transform: `scaleY(${Math.max(0.08, Math.min(1, level))})` }}
        />
      ))}
    </span>
  );
}
