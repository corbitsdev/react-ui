import { useCallback, useEffect, useRef, useState } from "react";

export type UseCopyOptions = {
  /** How long `copied` stays on after a successful copy, in ms. Default 2000. */
  readonly timeout?: number;
};

export type UseCopyResult = {
  /** A copy succeeded within the last `timeout` ms. */
  readonly copied: boolean;
  /** Writes `text` to the clipboard; resolves whether the write succeeded. */
  readonly copy: (text: string) => Promise<boolean>;
};

/**
 * Copy to the clipboard with a short-lived "copied" state for the control
 * that did it. A failed or unavailable clipboard leaves `copied` off, so a
 * control never claims a copy that did not happen. Copying again restarts the
 * timer; unmounting clears it.
 */
export function useCopy({
  timeout = 2000,
}: UseCopyOptions = {}): UseCopyResult {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, []);

  const copy = useCallback(
    async (text: string) => {
      let written = true;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        written = false;
      }
      if (!mountedRef.current) return written;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
      setCopied(written);
      if (!written) return false;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setCopied(false);
      }, timeout);
      return true;
    },
    [timeout],
  );

  return { copied, copy };
}
