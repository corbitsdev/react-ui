import { Mic, MicOff, Square } from "lucide-react";

import { cn } from "../lib/utils.js";

export type DictationState = "idle" | "starting" | "listening" | "denied" | "unsupported";

export type MicButtonProps = {
  readonly state: DictationState;
  readonly onToggle: () => void;
  readonly disabled?: boolean;
  readonly className?: string;
};

function labelFor(state: DictationState): string {
  if (state === "denied") return "Microphone blocked";
  if (state === "unsupported") return "Dictation unavailable";
  if (state === "listening") return "Stop dictating";
  if (state === "starting") return "Starting microphone";
  return "Dictate instead of typing";
}

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
 * `state` drives the pressed look, the glyph, and the label. Listening is
 * green with a stop square so colour is never the only channel; starting
 * stays the idle mic so it cannot be mistaken for a live capture.
 * `unsupported` is disabled. `denied` stays clickable so the host can open
 * `MicPermissionDialog` from `onToggle`.
 */
export function MicButton({ state, onToggle, disabled = false, className }: MicButtonProps) {
  const listening = state === "listening";
  const denied = state === "denied";
  const unusable = disabled || state === "unsupported";
  const label = labelFor(state);
  const Glyph = listening ? Square : denied ? MicOff : Mic;

  return (
    <button
      type="button"
      // Denied opens the permission dialog rather than toggling — declare the
      // popup and drop the toggle semantic.
      aria-pressed={denied ? undefined : listening}
      aria-haspopup={denied ? "dialog" : undefined}
      aria-label={label}
      disabled={unusable}
      // Tapping the mic must not blur the field being dictated into — a field
      // that commits on blur would lose the edit to its own microphone tap.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onToggle}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-md transition-colors disabled:opacity-50",
        !unusable && "active:brightness-95 motion-safe:active:scale-[0.97]",
        listening
          ? "bg-success text-success-foreground hover:bg-success/90"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Glyph className={listening ? "size-3.5 fill-current" : "size-4"} aria-hidden />
    </button>
  );
}
