/** A recorded session. An agent run and a workflow run share this header. */
export type TraceKind = "agent" | "workflow";

export type SpanKind =
  | "turn"
  | "reasoning"
  | "tool"
  | "permission"
  | "subagent"
  | "compact"
  | "error"
  | "event"
  | "step"
  | "gate"
  | "mail"
  | "provision"
  | "fork"
  | "reactor"
  | "network"
  | "attachment"
  | "citation"
  | "transform"
  | "nudge";

export type SpanStatus = "running" | "ok" | "error" | "waiting" | "denied";

export type GrantEffect = "allow" | "deny" | "ask";

export type GrantOrigin = "system" | "role" | "creator" | "invoker";

/** One grant that matched a tool call or a gate. Mirrors a resolved grant. */
export type GrantRef = {
  readonly id: string;
  readonly resource: string;
  readonly action: string;
  readonly effect: GrantEffect;
  readonly origin: GrantOrigin;
  readonly specificity?: number;
};

/**
 * The authorization outcome at one moment. `effect: "none"` is a call where
 * nothing matched and the runtime failed closed.
 */
export type GrantUse = {
  readonly effect: GrantEffect | "none";
  readonly resolvedBy: GrantRef | null;
  readonly matching: readonly GrantRef[];
  readonly blocked: boolean;
  readonly blockReason?: string;
};

export type SignatureStatus = "valid" | "invalid" | "unknown" | "missing";

export type MediaItem = {
  readonly name: string;
  readonly mediaType: string;
  readonly bytes: number;
  readonly note?: string;
};

/** One outbound or inbound hop. `external` means it left the host network. */
export type NetworkHop = {
  readonly method: string;
  readonly url: string;
  readonly status: number | null;
  readonly bytes: number;
  readonly external: boolean;
};

export type Usage = {
  readonly provider?: string;
  readonly model?: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  /** Tokens read from the provider cache. A slice of input, not an extra pile. */
  readonly cachedTokens?: number;
  readonly cacheWriteTokens?: number;
  readonly thinkingTokens?: number;
  readonly costUsd?: number;
};

/** What a model does that changes the bill, the latency, or the audit. */
export type ProviderInfo = {
  readonly provider: string;
  readonly model: string;
  readonly region?: string;
  readonly quirks: readonly string[];
};

export type PrincipalRef = {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly keyId: string;
};

export type TenantRef = {
  readonly id: string;
  readonly name: string;
};

export type Attribute = {
  readonly label: string;
  readonly value: string;
};

/** The instructions and tools the harness handed the model. */
export type AgentTool = {
  readonly name: string;
  readonly description: string;
};

export type AgentBrief = {
  readonly systemPrompt: string;
  readonly tools: readonly AgentTool[];
};

/** One turn the compactor kept or dropped. */
export type CompactionTurn = {
  readonly role: string;
  readonly title: string;
  readonly tokens: number;
  readonly kept: boolean;
  readonly note?: string;
};

/** A director `compact` action and the manifest record it wrote. */
export type Compaction = {
  readonly compactor: string;
  readonly version: string;
  readonly reason: string;
  readonly detail: string;
  readonly turnsBefore: number;
  readonly turnsAfter: number;
  readonly tokensBefore: number;
  readonly tokensAfter: number;
  readonly turns: readonly CompactionTurn[];
};

/** One context-strategy run. History and the prompt are different files. */
export type ContextChange = {
  readonly strategy: string;
  readonly version: string;
  readonly trigger: string;
  readonly reason: string;
  readonly summary: string;
};

export type NudgeAction =
  | "infer"
  | "execute_tools"
  | "compact"
  | "wait"
  | "checkpoint"
  | "reply"
  | "suspend"
  | "done";

/** One action the director handed the reactor. */
export type DirectorNudge = {
  readonly action: NudgeAction;
  readonly because: string;
};

/** Where a run was placed. Present once the hub has allocated a sidecar. */
export type Placement = {
  readonly sidecarId: string;
  readonly host: string;
  readonly region: string;
  readonly size: string;
  readonly packageName: string;
  readonly packageVersion: string;
  readonly generation: number;
  readonly status: string;
};

/** One timed step inside a trace. `startMs` is relative to the trace start. */
export type Span = {
  readonly id: string;
  readonly parentId: string | null;
  readonly kind: SpanKind;
  readonly name: string;
  readonly status: SpanStatus;
  readonly startMs: number;
  readonly durationMs: number;
  readonly input?: string;
  readonly output?: string;
  /** Chain of thought for a reasoning span, or a turn that streamed thinking. */
  readonly thinking?: string;
  readonly redacted?: boolean;
  readonly grant?: GrantUse;
  readonly media?: readonly MediaItem[];
  readonly network?: readonly NetworkHop[];
  readonly signature?: SignatureStatus;
  readonly usage?: Usage;
  readonly attributes?: readonly Attribute[];
  /** Host payload, secrets already scrubbed. Shown when the raw layer is on. */
  readonly payload?: string;
  readonly compaction?: Compaction;
  readonly contextChange?: ContextChange;
  readonly nudge?: DirectorNudge;
};

export type SessionSummary = {
  readonly id: string;
  readonly kind: TraceKind;
  readonly name: string;
  readonly actor: string;
  readonly model: string;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly tokens: number;
  readonly costUsd: number;
  readonly steps: number;
  readonly status: SpanStatus;
};

export type Trace = {
  readonly id: string;
  readonly kind: TraceKind;
  readonly name: string;
  readonly actor: string;
  readonly status: SpanStatus;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly spans: readonly Span[];
  readonly placement?: Placement;
  readonly principal?: PrincipalRef;
  readonly tenant?: TenantRef;
  readonly providers?: readonly ProviderInfo[];
  readonly brief?: AgentBrief;
};

export type Audience = "operator" | "cfo" | "coo" | "ciso";

/** How the steps are drawn. The audience picks a default. The caller can override it. */
export type TraceRepresentation = "timeline" | "ledger" | "cost" | "shape";

export const AUDIENCE_REPRESENTATION: Record<Audience, TraceRepresentation> = {
  operator: "timeline",
  cfo: "ledger",
  coo: "ledger",
  ciso: "timeline",
};

export type SeriesPoint = {
  readonly label: string;
  readonly value: number;
};

/** What the viewer is willing to show. Every layer is a caller-owned toggle. */
export type TraceLayers = {
  readonly reasoning: boolean;
  readonly grants: boolean;
  readonly io: boolean;
  readonly media: boolean;
  readonly network: boolean;
  readonly raw: boolean;
};

export const DEFAULT_LAYERS: TraceLayers = {
  reasoning: true,
  grants: true,
  io: true,
  media: true,
  network: true,
  raw: false,
};
