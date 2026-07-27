import { cn } from "../lib/utils.js";

export type ResearchSource = {
  readonly url: string;
  readonly title?: string;
  /** Where it came from — a publication, a forum, a feed name. */
  readonly source: string;
};

export type ResearchCluster = {
  readonly id: string;
  readonly title: string;
  readonly summary?: string;
  /** Source names this cluster drew on. */
  readonly sources?: readonly string[];
  readonly items?: readonly ResearchSource[];
};

export type ResearchQuote = {
  readonly quote: string;
  readonly author?: string;
  readonly source: string;
  readonly url?: string;
};

export type ResearchBrief = {
  readonly topic: string;
  readonly sourceCount: number;
  readonly itemCount: number;
  /** Human-readable coverage window, e.g. "Jan 1 – Mar 31". Pre-formatted. */
  readonly range?: string;
  /** The one sentence someone reads if they read nothing else. */
  readonly leadInsight?: string;
  readonly clusters?: readonly ResearchCluster[];
  readonly quotes?: readonly ResearchQuote[];
  readonly citations?: readonly ResearchSource[];
};

/**
 * Reads a brief (and its optional prose report) out of an artifact payload.
 *
 * Checks only `topic` and the two counts — the fields the header renders
 * unconditionally and the ones whose absence would print "undefined sources".
 * Everything below the header is already guarded by a presence check at its own
 * render site, so validating it here would only reject briefs this component
 * draws correctly.
 */
export function parseResearchArtifact(json: string): { brief: ResearchBrief; body?: string } | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;

  const candidate = raw as Partial<ResearchBrief> & { body?: unknown };
  if (
    typeof candidate.topic !== "string" ||
    typeof candidate.sourceCount !== "number" ||
    typeof candidate.itemCount !== "number"
  ) {
    return null;
  }
  const body = typeof candidate.body === "string" ? candidate.body : undefined;
  return body === undefined ? { brief: candidate as ResearchBrief } : { brief: candidate as ResearchBrief, body };
}

/**
 * A citation list can name the same URL twice — one item that clustered under
 * two sources. Both the numbering the reader sees and any export they take must
 * agree on the count, so dedupe once, here, at the point of render.
 */
function dedupeByUrl(sources: readonly ResearchSource[]): readonly ResearchSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}

/**
 * A structured research brief: what was found, grouped, quoted and cited.
 *
 * The layout is an argument in order — headline stat line, the lead insight,
 * then clusters, then evidence, then citations. A reader who stops after the
 * first screen should still have the finding; a reader who wants to audit it
 * can walk down to the sources without leaving the page.
 *
 * `body` is the prose report when the producer wrote one. Given both, the prose
 * is the deliverable and the structured data becomes supporting evidence behind
 * a `<details>` — collapsed rather than removed, because "show me your working"
 * is the second question every reader of a generated report asks. `<details>` is
 * a native disclosure: keyboard-operable and announced as expandable with no JS
 * and no ARIA of our own.
 *
 * Prose is rendered as pre-wrapped text, not parsed as Markdown. The registry
 * ships no Markdown dependency, and adding ~40kB of parser that a consumer then
 * owns is not something a component should decide on their behalf. Wrap the
 * `body` slot in your own renderer if you have one.
 */
export function ResearchBody({
  brief,
  body,
  className,
}: {
  readonly brief: ResearchBrief;
  readonly body?: string;
  readonly className?: string;
}) {
  const report = body?.trim() ?? "";
  const citations = dedupeByUrl(brief.citations ?? []);

  const data = (
    <div className="flex flex-col gap-6">
      {brief.clusters === undefined || brief.clusters.length === 0 ? null : (
        <section className="flex flex-col gap-3" aria-label="Themes">
          <h3 className="text-sm font-semibold">Themes</h3>
          {brief.clusters.map((cluster) => (
            <article key={cluster.id} className="flex flex-col gap-2 rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-sm leading-snug font-semibold">{cluster.title}</h4>
                {cluster.sources === undefined || cluster.sources.length === 0 ? null : (
                  <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {cluster.sources.join(", ")}
                  </span>
                )}
              </div>
              {cluster.summary === undefined ? null : (
                <p className="text-xs leading-relaxed text-muted-foreground">{cluster.summary}</p>
              )}
              {cluster.items === undefined || cluster.items.length === 0 ? null : (
                <ul className="flex flex-col gap-1.5">
                  {cluster.items.map((item) => (
                    <li key={item.url} className="min-w-0">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs leading-snug text-primary-emphasis underline-offset-2 hover:underline"
                      >
                        {item.title ?? item.url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>
      )}

      {brief.quotes === undefined || brief.quotes.length === 0 ? null : (
        <section className="flex flex-col gap-3" aria-label="Quotes">
          <h3 className="text-sm font-semibold">Quotes</h3>
          {brief.quotes.map((quote) => (
            // <figure>/<figcaption> rather than a div and a span: a quotation
            // with an attribution is exactly what the element pair is for, and
            // it is what makes the attribution reachable from the quote for a
            // screen reader instead of being a loose line of text after it.
            <figure key={`${quote.source}-${quote.quote.slice(0, 32)}`} className="border-l-2 border-border pl-4">
              <blockquote className="text-sm leading-relaxed italic">{quote.quote}</blockquote>
              <figcaption className="mt-1 text-xs text-muted-foreground">
                {quote.author === undefined ? "" : `${quote.author} · `}
                {quote.source}
                {quote.url === undefined ? null : (
                  <>
                    {" · "}
                    <a
                      href={quote.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-emphasis underline-offset-2 hover:underline"
                    >
                      source
                    </a>
                  </>
                )}
              </figcaption>
            </figure>
          ))}
        </section>
      )}

      {citations.length === 0 ? null : (
        <section className="flex flex-col gap-3" aria-label="Citations">
          <h3 className="text-sm font-semibold">Citations</h3>
          <ol className="flex flex-col gap-2">
            {citations.map((citation, index) => (
              <li key={citation.url} className="flex items-baseline gap-3 text-xs">
                <span className="w-6 shrink-0 text-right font-mono text-muted-foreground tabular-nums">{index + 1}</span>
                <span className="min-w-0 leading-relaxed">
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-words text-primary-emphasis underline-offset-2 hover:underline"
                  >
                    {citation.title ?? citation.url}
                  </a>
                  <span className="text-muted-foreground"> · {citation.source}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <header className="flex flex-col gap-1.5">
        <h2 className="text-base leading-snug font-semibold">{brief.topic}</h2>
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          {brief.sourceCount.toLocaleString()} sources · {brief.itemCount.toLocaleString()} items
          {brief.range === undefined ? "" : ` · ${brief.range}`}
        </p>
        {brief.leadInsight === undefined ? null : (
          <p className="max-w-prose text-sm leading-relaxed">{brief.leadInsight}</p>
        )}
      </header>

      {report === "" ? (
        data
      ) : (
        <>
          <div className="max-w-prose text-sm leading-relaxed whitespace-pre-wrap">{report}</div>
          <details className="group border-t border-border pt-4">
            <summary className="cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground">
              Sources &amp; data ({brief.sourceCount.toLocaleString()} sources ·{" "}
              {brief.itemCount.toLocaleString()} items)
            </summary>
            <div className="mt-5">{data}</div>
          </details>
        </>
      )}
    </div>
  );
}
