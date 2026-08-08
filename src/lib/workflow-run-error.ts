/**
 * Classification/sanitization boundary for a failed step's raw error text.
 *
 * A step's own thrown error can carry internal identifiers, stack fragments
 * or internal hostnames, and nothing user-facing may render it as-is.
 * `classifyRunError` maps the known-safe shapes — a `"<Provider> API error:
 * <status> …"` tool-package convention, a network-level failure — to
 * plain-language messages, and defaults everything unrecognized to a
 * generic-but-honest internal message. The raw text survives on the result
 * for an operator surface or a log; it must never reach an end-user panel.
 */

export type RunErrorKind =
  | "external-auth"
  | "external-rate-limit"
  | "external-unavailable"
  | "external-rejected"
  | "network"
  | "internal";

export type ClassifiedRunError = {
  readonly kind: RunErrorKind;
  /** Plain-language message safe to render to end users. */
  readonly userMessage: string;
  /** The original error text — operator surfaces and logs only. */
  readonly raw: string;
};

const PROVIDER_API_ERROR = /^([A-Za-z][A-Za-z0-9]*(?: [A-Za-z0-9]+){0,2}) API error: (\d{3})/;
const ANY_API_ERROR = /\bAPI error: (\d{3})/;
const GENERIC_PROVIDER_LABEL = "An external service";

const NETWORK_PATTERNS = [
  /\bfetch failed\b/i,
  /\bECONN(REFUSED|RESET|ABORTED)\b/,
  /\bENOTFOUND\b/,
  /\bETIMEDOUT\b/,
  /\bEAI_AGAIN\b/,
  /\bsocket\b.*\b(closed|hang ?up|reset)\b/i,
  /\b(request|fetch|connect(?:ion)?|socket)\b.*\btimed out\b/i,
  /\bnetwork (error|request failed)\b/i,
];

const INTERNAL_MESSAGE =
  "Something went wrong inside this workflow run. Try running it again; if it keeps failing, contact your workspace admin.";

const NETWORK_MESSAGE = "A service this workflow depends on couldn't be reached. Try running it again in a moment.";

function classifyProviderError(provider: string, status: number, raw: string): ClassifiedRunError {
  const credentialRef = provider === GENERIC_PROVIDER_LABEL ? "credential's" : `${provider} credential's`;
  if (status === 401 || status === 403) {
    return {
      kind: "external-auth",
      userMessage: `${provider} declined the request (${status}). Check the connected ${credentialRef} access and try again.`,
      raw,
    };
  }
  if (status === 429) {
    return {
      kind: "external-rate-limit",
      userMessage: `${provider} is rate-limiting requests right now. Wait a few minutes and run this again.`,
      raw,
    };
  }
  if (status >= 500) {
    return {
      kind: "external-unavailable",
      userMessage: `${provider} had a problem on its end (${status}). Try running this again shortly.`,
      raw,
    };
  }
  return {
    kind: "external-rejected",
    userMessage: `${provider} rejected the request (${status}). Try again, and contact your workspace admin if it keeps failing.`,
    raw,
  };
}

export function classifyRunError(raw: string): ClassifiedRunError {
  const providerMatch = PROVIDER_API_ERROR.exec(raw);
  if (providerMatch?.[1] !== undefined && providerMatch[2] !== undefined) {
    return classifyProviderError(providerMatch[1], Number(providerMatch[2]), raw);
  }
  const anyApiErrorMatch = ANY_API_ERROR.exec(raw);
  if (anyApiErrorMatch?.[1] !== undefined) {
    return classifyProviderError(GENERIC_PROVIDER_LABEL, Number(anyApiErrorMatch[1]), raw);
  }
  if (NETWORK_PATTERNS.some((pattern) => pattern.test(raw))) {
    return { kind: "network", userMessage: NETWORK_MESSAGE, raw };
  }
  return { kind: "internal", userMessage: INTERNAL_MESSAGE, raw };
}

/**
 * Plain-language line for a step's live inference issue — a still-running
 * step reporting itself as stalled-but-alive rather than dead. The input is
 * whatever fixed category enum the host's runtime already classifies
 * inference failures into (a timeout, a quota hit, a bad credential), passed
 * through as a plain string so this module carries no dependency on the
 * runtime's error types. The step keeps running for every category except
 * `context_overflow`, where the input itself must shrink before a retry can
 * help — its message is the one that omits the retry claim.
 */
export function describeLiveInferenceIssue(category: string): string {
  switch (category) {
    case "timeout":
      return "Model provider timed out — retrying";
    case "retryable":
      return "Model provider had a transient error — retrying";
    case "quota_exhausted":
      return "Model provider is rate-limiting requests — retrying";
    case "credential_failure":
      return "Model provider rejected the credential — retrying";
    case "context_overflow":
      return "Input is too large for the model";
    case "protocol_mismatch":
      return "Model provider returned an unexpected response — retrying";
    case "aborted":
      return "The step was interrupted — retrying";
    default:
      return "Model provider had a problem — retrying";
  }
}
