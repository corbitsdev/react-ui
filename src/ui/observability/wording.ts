import { formatTokens } from "./format.js";
import type { Compaction, Span } from "./model.js";

/** The type column. Callers pass `type`. Otherwise the row shows `kind`. */
export function rowMarker(span: Span): string {
  return span.type ?? span.kind;
}

/**
 * The row title. A caller-supplied `label` wins. Otherwise the title is what
 * the payload did, then the step name.
 */
export function stepTitle(span: Span): string {
  if (span.label !== undefined && span.label.length > 0) return span.label;
  const did = whatItDid(span);
  if (did !== undefined) return did;
  if (span.compaction !== undefined) {
    return `${span.compaction.turnsBefore} turns down to ${span.compaction.turnsAfter}, ${compactionLine(span.compaction)}`;
  }
  if (span.nudge !== undefined) return span.nudge.because;
  if (span.contextChange !== undefined) return span.contextChange.summary;
  if (span.kind === "reasoning" && span.thinking !== undefined) {
    const line = span.thinking.split("\n")[0] ?? span.thinking;
    return line.length > 88 ? `${line.slice(0, 85)}…` : line;
  }
  return span.name;
}

export function compactionLine(compaction: Compaction): string {
  return `${formatTokens(compaction.tokensBefore)} down to ${formatTokens(compaction.tokensAfter)}`;
}

function whatItDid(span: Span): string | undefined {
  const hop = span.network?.[0];
  if (hop !== undefined) return `${hop.method} ${shortUrl(hop.url)}`;
  const record = recordOf(span.input);
  if (record === undefined) return undefined;
  const command = text(record, "command") ?? text(record, "cmd");
  if (command !== undefined) return command;
  const pattern = text(record, "pattern");
  const path = text(record, "path") ?? text(record, "file");
  if (pattern !== undefined && !span.name.includes(pattern)) {
    return path === undefined
      ? `Find ${pattern}`
      : `Find ${pattern} in ${path}`;
  }
  if (path !== undefined && !span.name.includes(path))
    return `${verb(span.name)} ${path}`;
  const url = text(record, "url");
  if (url !== undefined) return shortUrl(url);
  return undefined;
}

function verb(name: string): string {
  if (name === "write_file" || name === "write") return "Write";
  if (name === "read_file" || name === "read") return "Read";
  if (name.includes("_")) return name.replaceAll("_", " ");
  return name;
}

function shortUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function recordOf(
  input: string | undefined,
): Record<string, unknown> | undefined {
  if (input === undefined || !input.startsWith("{")) return undefined;
  try {
    const value: unknown = JSON.parse(input);
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const record: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value)) record[key] = item;
      return record;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function text(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
