import { classifyRunError } from "../lib/workflow-run-error.js";
import { cn } from "../lib/utils.js";

const NO_ERROR_DETAILS = "No error details are available. Start a new run to try again.";
const NEVER_STARTED_DETAILS = "This run couldn't be started. Start a new run to try again.";
const LOG_UNAVAILABLE_DETAILS = "We couldn't load this run's details. Refresh to try again, or start a new run.";

export type FailedRunNoticeProps = {
  /** The failed display step's name, or `null` when no step names the failure. */
  readonly failedStepLabel?: string | null;
  /** True for a genuine never-started run — see `runNeverStarted` in
   * `workflow-run-progress.ts` for the exact rule. */
  readonly neverStarted?: boolean;
  /** True when the run's own step log could not be read at all. */
  readonly logUnavailable?: boolean;
  /** The step's raw error text, sanitized here before render. Omit when no
   * step carries one — the fallback copy explains why none is shown. */
  readonly rawErrorMessage?: string | null;
  readonly className?: string;
};

/**
 * The one failed-run notice a workflow surface renders: which step failed,
 * plus a sanitized message — never the step's raw error text, which can
 * carry internal identifiers. Falls back to an honest no-details line when
 * nothing more specific is known.
 */
export function FailedRunNotice({
  failedStepLabel = null,
  neverStarted = false,
  logUnavailable = false,
  rawErrorMessage = null,
  className,
}: FailedRunNoticeProps) {
  let heading: string;
  if (neverStarted) {
    heading = "This run didn't start";
  } else if (failedStepLabel === null) {
    heading = "Run failed";
  } else {
    heading = `Run failed at ${failedStepLabel}`;
  }

  let fallbackDetails: string;
  if (neverStarted) {
    fallbackDetails = NEVER_STARTED_DETAILS;
  } else if (logUnavailable) {
    fallbackDetails = LOG_UNAVAILABLE_DETAILS;
  } else {
    fallbackDetails = NO_ERROR_DETAILS;
  }

  const message = rawErrorMessage === null ? fallbackDetails : classifyRunError(rawErrorMessage).userMessage;

  return (
    <div role="alert" className={cn("rounded-lg border border-destructive/40 bg-destructive/10 p-4", className)}>
      <p className="text-sm font-medium text-destructive">{heading}</p>
      <p className="mt-1 text-sm text-destructive">{message}</p>
    </div>
  );
}
