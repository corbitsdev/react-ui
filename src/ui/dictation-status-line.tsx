import type { DictationState } from "./mic-button.js";
import { VoiceWaveform } from "./voice-waveform.js";
import { cn } from "../lib/utils.js";

export type DictationStatusLineProps = {
  readonly state: DictationState;
  /** Recent input levels, forwarded to `VoiceWaveform` while listening. */
  readonly levels?: readonly number[];
  /** Shown while `state` is `"starting"`. */
  readonly startingLabel?: string;
  /** Shown while `state` is `"listening"`, before the waveform. */
  readonly listeningLabel?: string;
  /** Shown while `state` is `"denied"`, in place of the waveform row. */
  readonly errorMessage?: string;
  readonly className?: string;
};

/**
 * The line under a composer that a microphone toggle turns on: "Listening:"
 * with a waveform, a starting message, or a refusal — never more than one of
 * these, and absent entirely once `state` is `"idle"` or `"unsupported"`, so
 * the row does not otherwise change the composer's shape.
 */
export function DictationStatusLine({
  state,
  levels = [],
  startingLabel = "Starting microphone…",
  listeningLabel = "Listening:",
  errorMessage,
  className,
}: DictationStatusLineProps) {
  if (state === "idle" || state === "unsupported") return null;

  if (state === "denied") {
    return (
      <p role="alert" className={cn("text-xs text-destructive", className)}>
        {errorMessage ?? "Microphone access was blocked."}
      </p>
    );
  }

  if (state === "starting") {
    return (
      <p
        aria-live="polite"
        className={cn("text-xs text-muted-foreground", className)}
      >
        {startingLabel}
      </p>
    );
  }

  return (
    <p
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground",
        className,
      )}
    >
      <span>{listeningLabel}</span>
      <VoiceWaveform levels={levels} className="text-ok" />
    </p>
  );
}
