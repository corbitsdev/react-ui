const DEFAULT_ALLOWED_PROTOCOLS: readonly string[] = ["http:", "https:"];

/**
 * Is `url` safe to hand to a live sink — `href`, `src`, `window.open` — as-is?
 *
 * Agent- and artifact-supplied strings are untrusted input: a `javascript:`
 * or `data:` value handed straight to `href` becomes a live script the
 * moment someone clicks it. Checking `.protocol` after `new URL()` parses the
 * string, rather than matching a prefix, is what defeats tricks like embedded
 * tabs/newlines (`java\tscript:`) or mixed case (`JavaScript:`) — the URL
 * parser strips and normalizes both away before the comparison ever runs.
 *
 * Relative and protocol-relative URLs (`/path`, `//host/path`) fail to parse
 * without a base and are rejected rather than resolved against one: every
 * sink this guards links to a third-party resource — a citation, a download,
 * an embed — so there is no in-app page a bare path could sensibly mean, and
 * inventing a base to resolve against would only guess wrong.
 */
export function isSafeUrl(url: string, allowedProtocols: readonly string[] = DEFAULT_ALLOWED_PROTOCOLS): boolean {
  try {
    return allowedProtocols.includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

/**
 * `url` back, unchanged, if `isSafeUrl` accepts it — otherwise `undefined`.
 *
 * The shape callers want at a render site: a value they can put straight
 * into `href`/`src` when present, and a clean signal to fall back to plain
 * text when not. Never returns a placeholder like `"#"` — a disabled-looking
 * link that is secretly still a link is its own trap.
 */
export function toSafeHref(
  url: string | undefined,
  allowedProtocols: readonly string[] = DEFAULT_ALLOWED_PROTOCOLS,
): string | undefined {
  if (url === undefined) return undefined;
  return isSafeUrl(url, allowedProtocols) ? url : undefined;
}
