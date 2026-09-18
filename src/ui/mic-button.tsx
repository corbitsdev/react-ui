import { Mic } from "lucide-react";

import { cn } from "../lib/utils.js";

export type DictationState = "idle" | "starting" | "listening" | "denied" | "unsupported";

export type MicButtonProps = {
  readonly state: DictationState;
  readonly onToggle: () => void;
  readonly disabled?: boolean;
  readonly className?: string;
};

/**
 * A microphone toggle for dictation, presentational only.
 *
 * This component and its siblings (`VoiceWaveform`, `DictationStatusLine`,
 * `MicPermissionDialog`) carry no `SpeechRecognition`, Tauri, or media-device
 * code — react-ui never imports a browser or native capture API. A consumer
 * wires them to a backend through a hook shaped roughly like:
 *
 * ```ts
 * type UseDictation = (value: string, onValueChange: (value: string) => void) => {
 *   supported: boolean;
 *   state: DictationState;
 *   levels: number[]; // recent RMS samples, 0..1, oldest first
 *   errorMessage: string | null; // set when state is "denied"
 *   permissionHelp: { title: string; detail: string; action: string } | null;
 *   start: () => void;
 *   stop: () => void;
 *   dismiss: () => void;
 * };
 * ```
 *
 * `state` drives both the pressed look and the label: green while listening,
 * because a live microphone must never be ambiguous, and disabled while the
 * browser has refused permission or does not support dictation at all.
 */
export function MicButton({ state, onToggle, disabled = false, className }: MicButtonProps) {
  const listening = state === "listening" || state === "starting";
  const unusable = disabled || state === "unsupported";
  const label = listening ? "Stop dictating" : "Dictate instead of typing";

  return (
    <button
      type="button"
      aria-pressed={listening}
      aria-label={label}
      title={label}
      disabled={unusable}
      onClick={onToggle}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-md transition-colors disabled:opacity-40",
        listening
          ? "bg-success text-success-foreground hover:bg-success/90"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Mic className="size-4" aria-hidden />
    </button>
  );
}
