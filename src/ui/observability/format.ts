export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function formatClock(ms: number): string {
  const sign = ms < 0 ? "−" : "+";
  return `${sign}${formatDuration(Math.abs(ms))}`;
}

export function formatTokens(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)}k`;
  return `${(value / 1_000_000).toFixed(2)}M`;
}

export function formatSpeed(tokensPerSecond: number | null): string {
  if (tokensPerSecond === null || !Number.isFinite(tokensPerSecond)) return "—";
  if (tokensPerSecond < 10) return `${tokensPerSecond.toFixed(1)} tok/s`;
  return `${Math.round(tokensPerSecond)} tok/s`;
}

export function formatCost(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function spanTokens(span: {
  usage?: { inputTokens?: number; outputTokens?: number };
}): number {
  return (span.usage?.inputTokens ?? 0) + (span.usage?.outputTokens ?? 0);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
