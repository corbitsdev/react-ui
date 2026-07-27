import { Download } from "lucide-react";

import { type Artifact, type ArtifactForm, artifactForm } from "../lib/artifact.js";
import { cn } from "../lib/utils.js";
import { ArtifactNotice } from "./artifact-notice.js";
import { buttonVariants } from "./button.js";
import { CompareBodyFromJson } from "./compare-body.js";
import { CsvTable } from "./csv-table.js";
import { EmbedBody } from "./embed-body.js";
import { ResearchBody, parseResearchArtifact } from "./research-body.js";

export type ArtifactBodyProps = {
  readonly artifact: Artifact;
  /**
   * Overrides the form derived from `artifact.kind`. Use it when the kind
   * string cannot tell the whole story — a `file` that turned out to be an
   * image, say — rather than teaching `artifactForm` about one caller's edge.
   */
  readonly form?: ArtifactForm;
  readonly className?: string;
};

/**
 * One artifact, drawn the way its kind implies.
 *
 * A `switch` over seven forms, not a renderer registry. The dispatch is the
 * whole component and it fits on a screen, which is the point: you own this
 * file after `shadcn add`, and a lookup table of injected components would mean
 * reading two files and a type parameter to answer "what happens to a CSV". Add
 * a case; delete the ones you do not have.
 *
 * Every branch that can receive an empty payload checks for one first, because
 * "empty" is a real state here — artifacts are frequently rendered while they
 * are still being written — and each form's own empty rendering (a table with
 * no rows, a frame with no src) reads as a fault rather than as progress.
 */
export function ArtifactBody({ artifact, form, className }: ArtifactBodyProps) {
  const resolved = form ?? artifactForm(artifact.kind);
  const content = artifact.content;
  const blank = content.trim() === "";

  return <div className={cn("w-full", className)}>{body()}</div>;

  function body() {
    switch (resolved) {
      case "image": {
        // The thumbnail URL, not the content: an image artifact's bytes live
        // behind a route, and `content` for one is either empty or a caption.
        const src = artifact.thumbnailUrl ?? artifact.downloadUrl;
        if (src === undefined) return <ArtifactNotice pending={artifact.pending} />;
        return (
          <figure className="flex flex-col gap-3">
            {/* A plain <img>, not `next/image`: this file is copied into
                whatever app installs it, and half of those are not Next apps. */}
            <img src={src} alt={artifact.title} className="max-h-[480px] max-w-full rounded-lg border border-border" />
            {blank ? null : <figcaption className="text-xs text-muted-foreground">{content}</figcaption>}
          </figure>
        );
      }

      case "download": {
        if (artifact.downloadUrl === undefined) {
          return <ArtifactNotice message="This file has no download location, so it cannot be retrieved." />;
        }
        return (
          <a
            href={artifact.downloadUrl}
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download aria-hidden />
            Download {artifact.title}
          </a>
        );
      }

      case "embed":
        return (
          <EmbedBody
            url={content.trim()}
            title={artifact.title}
            {...(artifact.downloadUrl === undefined ? {} : { downloadUrl: artifact.downloadUrl })}
          />
        );

      case "table":
        if (blank) return <ArtifactNotice pending={artifact.pending} />;
        return (
          <div className="flex flex-col gap-3">
            {artifact.downloadUrl === undefined ? null : (
              <a
                href={artifact.downloadUrl}
                download
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start")}
              >
                <Download aria-hidden />
                Download
              </a>
            )}
            <CsvTable text={content} caption={artifact.title} />
          </div>
        );

      case "comparison":
        return <CompareBodyFromJson content={content} {...(artifact.pending === undefined ? {} : { pending: artifact.pending })} />;

      case "research": {
        if (blank) return <ArtifactNotice pending={artifact.pending} />;
        const parsed = parseResearchArtifact(content);
        // Unparseable is not a failure worth an error card — the payload is
        // still the artifact, so fall through to prose and let it be read.
        if (parsed === null) return <Prose text={content} />;
        return <ResearchBody brief={parsed.brief} {...(parsed.body === undefined ? {} : { body: parsed.body })} />;
      }

      case "prose":
        if (blank) return <ArtifactNotice pending={artifact.pending} />;
        return <Prose text={content} />;
    }
  }
}

/**
 * Plain text, wrapped and measured.
 *
 * Not a Markdown renderer: this registry ships no Markdown dependency, and
 * choosing one on a consumer's behalf — with its sanitiser, its plugin surface
 * and its bundle — is not a decision a body component gets to make. Replace
 * this function with your renderer; it is four lines and one import away.
 *
 * `max-w-prose` caps the measure at roughly 65 characters. Full-bleed body text
 * on a wide screen is unreadable regardless of how good the type is.
 */
function Prose({ text }: { readonly text: string }) {
  return <div className="max-w-prose text-sm leading-relaxed whitespace-pre-wrap">{text}</div>;
}
