import { useState } from "react";

import { useMediaViewer } from "../../src/hooks/use-media-viewer.js";
import type {
  ConversationPart,
  PartImage,
  PartSources,
} from "../../src/lib/conversation.js";
import { Button } from "../../src/ui/button.js";
import {
  GeneratedImages,
  generatedImageViewerItems,
} from "../../src/ui/generated-images.js";
import { MediaViewer } from "../../src/ui/media-viewer.js";
import { Source, Sources } from "../../src/ui/sources.js";
import { generatedImages, shortChat } from "./samples/conversations.js";

export default { title: "Chat / Media" };

const parts: readonly ConversationPart[] = [
  ...generatedImages.messages,
  ...shortChat.messages,
].flatMap((message) => message.parts);

function imagePart(id: string): PartImage {
  const part = parts.find(
    (candidate): candidate is PartImage =>
      candidate.kind === "image" && candidate.id === id,
  );
  if (part === undefined) throw new Error(`no image part ${id} in the samples`);
  return part;
}

const fourImages = imagePart("images-part-1");
const oneImage = imagePart("images-part-2");
const failedImages = imagePart("images-part-3");
const generatingImages = imagePart("images-part-4");
const twoImages: PartImage = {
  ...fourImages,
  id: "images-part-two",
  prompt: "Two directions for the deck cover",
  images: fourImages.images.slice(0, 2),
};

const sourcesPart = parts.find(
  (candidate): candidate is PartSources => candidate.kind === "sources",
);

/** Images wired to a viewer, with download and copy reported beside them. */
function Gallery({
  part,
  defaultIndex = null,
}: {
  readonly part: PartImage;
  readonly defaultIndex?: number | null;
}) {
  const viewer = useMediaViewer({
    items: generatedImageViewerItems(part),
    defaultIndex,
  });
  const [last, setLast] = useState("Nothing yet");
  return (
    <div className="flex flex-col gap-3">
      <GeneratedImages
        part={part}
        onOpen={viewer.open}
        onDownload={(index) => setLast(`Download image ${index + 1}`)}
        onCopy={(index) => setLast(`Copy image ${index + 1}`)}
      />
      <p className="text-sm text-muted-foreground">
        Last action: <output>{last}</output>
      </p>
      <MediaViewer viewer={viewer} />
    </div>
  );
}

export const OneImage = () => <Gallery part={oneImage} />;

export const TwoImages = () => <Gallery part={twoImages} />;

export const FourImages = () => <Gallery part={fourImages} />;

/** Placeholders hold the final size under the forming grain while the clock runs. */
export const Generating = () => <GeneratedImages part={generatingImages} />;

/**
 * Starts generating; "Land the images" finishes the part, and the grain
 * reveals each image in a short cascade. Reduced motion skips the reveal.
 */
export const Revealing = () => {
  const [landed, setLanded] = useState(false);
  const part: PartImage = landed
    ? twoImages
    : {
        ...twoImages,
        state: "generating",
        images: [],
        expected: { count: 2, width: 1536, height: 1024 },
      };
  return (
    <div className="flex flex-col items-start gap-3">
      <Button variant="outline" size="sm" onClick={() => setLanded(!landed)}>
        {landed ? "Generate again" : "Land the images"}
      </Button>
      <div className="w-full">
        <Gallery part={part} />
      </div>
    </div>
  );
};

export const Failed = () => {
  const [retries, setRetries] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <GeneratedImages
        part={failedImages}
        onRetry={() => setRetries(retries + 1)}
      />
      <p className="text-sm text-muted-foreground">
        Retries: <output>{retries}</output>
      </p>
    </div>
  );
};

export const SourcesList = () => (
  <Sources className="max-w-2xl">
    {(sourcesPart?.sources ?? []).map((source, index) => (
      <Source key={source.url} href={source.url} index={index + 1}>
        {source.title}
      </Source>
    ))}
    <Source
      href="javascript:alert(1)"
      index={(sourcesPart?.sources.length ?? 0) + 1}
    >
      A source with an unsafe address shows as text
    </Source>
  </Sources>
);

/** The viewer open on the second of four images; arrow keys step, Escape closes. */
export const Viewer = () => <Gallery part={fourImages} defaultIndex={1} />;
