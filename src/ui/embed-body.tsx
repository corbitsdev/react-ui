import { ExternalLink } from "lucide-react";

import { isSafeUrl, toSafeHref } from "../lib/url.js";
import { cn } from "../lib/utils.js";
import { ArtifactNotice } from "./artifact-notice.js";
import { buttonVariants } from "./button.js";

/**
 * Everything embedded here is third-party: a deck on someone's hosting, a
 * rendered document, a preview a model produced. None of it is trusted, so the
 * sandbox is opened one capability at a time.
 *
 * `allow-scripts` and `allow-same-origin` together are required for essentially
 * every real embed (slide players and PDF viewers both need them) and *together*
 * they are what lets framed content reach its own origin's storage — which is
 * correct and expected for a third-party player on its own domain. What is
 * withheld is the set that lets the frame act on the *user*:
 * `allow-top-navigation` (redirect the tab out from under them),
 * `allow-popups` (open a tab that outlives the frame), and `allow-forms` (POST
 * credentials somewhere). A viewer needs none of the three.
 */
const EMBED_SANDBOX = "allow-scripts allow-same-origin allow-presentation";

const EMBED_ALLOWED_PROTOCOLS = ["https:"] as const;

export type EmbedBodyProps = {
  /** Must be `https:`. Anything else renders the fallback notice. */
  readonly url: string;
  /** Names the frame for assistive tech. Required — an unnamed frame is unnavigable. */
  readonly title: string;
  readonly description?: string;
  /** Offers the original file alongside the embed, when the host serves one. */
  readonly downloadUrl?: string;
  /**
   * Frame shape. `wide` is 16:9 for slides; `tall` suits paged documents, where
   * a 16:9 box shows a third of a page and forces scrolling inside a scroller.
   */
  readonly aspect?: "wide" | "tall";
  readonly className?: string;
};

/**
 * A third-party URL, framed.
 *
 * One component covers every embedded-viewer kind — slide decks, hosted
 * documents, rendered previews. They differ only in the URL and the frame's
 * proportions, and three near-identical files is how three near-identical
 * sandboxes drift apart until one of them is wrong.
 *
 * The escape hatch below the frame is not decoration. Embedding is the thing
 * most likely to be blocked by a frame-ancestors policy, an extension or a
 * login wall, and an iframe that renders blank fires no error we can catch — so
 * the direct link is always present rather than being a fallback we would have
 * to detect our way into.
 */
export function EmbedBody({ url, title, description, downloadUrl, aspect = "wide", className }: EmbedBodyProps) {
  if (!isSafeUrl(url, EMBED_ALLOWED_PROTOCOLS)) {
    return <ArtifactNotice message="This link is missing or is not a secure (https) address, so it cannot be shown." />;
  }
  const safeDownloadUrl = toSafeHref(downloadUrl);

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      {description === undefined ? null : <p className="max-w-prose text-sm text-muted-foreground">{description}</p>}
      <div
        className={cn(
          "w-full overflow-hidden rounded-lg border border-border bg-card",
          aspect === "wide" ? "aspect-video" : "aspect-[3/4] max-h-[75vh]",
        )}
      >
        <iframe src={url} title={title} sandbox={EMBED_SANDBOX} allow="fullscreen" className="size-full border-0" />
      </div>
      <div className="flex items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ExternalLink aria-hidden />
          Open in a new tab
        </a>
        {safeDownloadUrl === undefined ? null : (
          <a href={safeDownloadUrl} download className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Download
          </a>
        )}
      </div>
    </div>
  );
}
