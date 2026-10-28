"use client";

import {
  Copy,
  Download,
  Maximize2,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type * as React from "react";

import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion.js";
import type { ConversationImage, PartImage } from "../lib/conversation.js";
import { safeMediaSrc } from "../lib/media-src.js";
import { cn } from "../lib/utils.js";
import { Button } from "./button.js";
import { DitherField } from "./dither-field.js";
import type { MediaViewerItem } from "./media-viewer.js";
import { ShimmerText } from "./shimmer-text.js";

/** A placeholder's size when the part does not say what is coming. */
const DEFAULT_EXPECTED = { count: 1, width: 1024, height: 1024 };

/** Tiles in a grid reveal this far apart, so they cascade. */
const REVEAL_STAGGER_MS = 90;

/**
 * Where an image loads from: its URL, or a `data:` URL built from its bare
 * base64. `undefined` when it cannot be shown safely: a URL that is not
 * `http:`, `https:`, `blob:` or a `data:` image, or base64 that is not an image.
 */
export function conversationImageSrc(
  image: ConversationImage,
): string | undefined {
  if (image.base64 !== undefined) {
    return /^image\/[a-z0-9.+-]+$/i.test(image.mediaType)
      ? `data:${image.mediaType};base64,${image.base64}`
      : undefined;
  }
  return safeMediaSrc(image.url, "media");
}

/** A file name for one image of a part: the prompt's first words, then which image. */
function generatedImageFileName(part: PartImage, index: number): string {
  const image = part.images[index];
  const subtype = image?.mediaType.split("/")[1]?.split(/[;+]/)[0] ?? "";
  const extension = subtype === "" ? "png" : subtype.toLowerCase();
  const slug = part.prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join("-");
  return `${slug === "" ? "image" : slug}-${index + 1}.${extension}`;
}

/**
 * A part's images as `MediaViewer` items, in the same order as its tiles. An
 * image that cannot be shown safely keeps its place but has no `src`, so the
 * viewer offers no preview and no download for it.
 */
export function generatedImageViewerItems(
  part: PartImage,
): readonly MediaViewerItem[] {
  return part.images.map((image, index) => {
    const src = conversationImageSrc(image);
    return {
      name: generatedImageFileName(part, index),
      mediaType: image.mediaType,
      ...(src === undefined ? {} : { src }),
      detail: `${image.width} × ${image.height}`,
      ...(image.alt === undefined ? {} : { alt: image.alt }),
    };
  });
}

type GeneratedImagesContextValue = {
  readonly seed: number;
  /** Names an image that has no `alt`. */
  readonly prompt: string;
  /** Seen generating in this view: its images are revealed by the grain. */
  readonly watched: boolean;
  readonly onOpen: ((index: number, opener: HTMLElement) => void) | undefined;
  readonly onDownload: ((index: number) => void) | undefined;
  readonly onCopy: ((index: number) => void) | undefined;
};

const GeneratedImagesContext =
  createContext<GeneratedImagesContextValue | null>(null);

function useGeneratedImagesContext(part: string): GeneratedImagesContextValue {
  const context = useContext(GeneratedImagesContext);
  if (context === null) {
    throw new Error(`${part} must be inside GeneratedImages.`);
  }
  return context;
}

type GeneratedImageContextValue = {
  readonly index: number;
  readonly label: string;
  /** It could not be shown, so there is nothing to open, download or copy. */
  readonly broken: boolean;
};

const GeneratedImageContext = createContext<GeneratedImageContextValue | null>(
  null,
);

/** A stable number from the part's id, so each part's grain moves differently. */
function seedOf(id: string): number {
  let sum = 0;
  for (let at = 0; at < id.length; at += 1) sum += id.charCodeAt(at);
  return sum;
}

/** How many of the prompt's words name an image that has no `alt`. */
const LABEL_WORDS = 6;

function imageLabel(
  image: ConversationImage,
  index: number,
  prompt: string,
): string {
  if (image.alt !== undefined) return image.alt;
  const opening = prompt.trim().split(/\s+/).slice(0, LABEL_WORDS).join(" ");
  return opening === ""
    ? `Image ${index + 1}`
    : `${opening}, image ${index + 1}`;
}

// `part` and `onCopy` are also DOM attributes; here they mean the image part
// and copying an image.
export type GeneratedImagesProps = Omit<
  React.ComponentProps<"div">,
  "children" | "part" | "onCopy"
> & {
  readonly part: PartImage;
  /** A tile was chosen; `opener` is where focus should go back to. */
  readonly onOpen?: ((index: number, opener: HTMLElement) => void) | undefined;
  /** Offered when the part failed. */
  readonly onRetry?: (() => void) | undefined;
  readonly onDownload?: ((index: number) => void) | undefined;
  readonly onCopy?: ((index: number) => void) | undefined;
  /**
   * Renders one finished image. Defaults to a `GeneratedImage` with
   * `GeneratedImageActions` for whichever of the callbacks are given.
   */
  readonly renderImage?:
    | ((image: ConversationImage, index: number) => React.ReactNode)
    | undefined;
};

/**
 * Images an agent made, from one image part.
 *
 * While generating, a placeholder per expected image holds the final size
 * (so nothing shifts when the images land) under the forming dither grain,
 * with "Generating" and the elapsed time above. Images made while this view
 * watched are revealed by that grain, in a short cascade; images that were
 * already there simply load. One image shows large, more in two columns. The
 * prompt sits beneath as the caption. A failed part shows a message, and
 * "Try again" when `onRetry` is given.
 *
 * The elapsed time counts from when this component first saw the part, since
 * the part carries no start time; a remount starts it again.
 */
export function GeneratedImages({
  part,
  onOpen,
  onRetry,
  onDownload,
  onCopy,
  renderImage,
  className,
  style,
  ...props
}: GeneratedImagesProps) {
  const [watched, setWatched] = useState(part.state === "generating");
  if (part.state === "generating" && !watched) setWatched(true);

  const failed = part.state === "error";
  const generating = part.state === "generating";
  const expected = part.expected ?? DEFAULT_EXPECTED;
  const slots = generating ? expected.count : part.images.length;
  const first = part.images[0];
  const ratio =
    (first?.width ?? expected.width) / (first?.height ?? expected.height);
  const single = slots === 1;
  const label = single ? "image" : `${slots} images`;
  const seed = seedOf(part.id);
  const hasActions =
    onOpen !== undefined || onDownload !== undefined || onCopy !== undefined;
  const sizing: Record<`--${string}`, string> =
    single && !failed ? { "--generated-images-ratio": String(ratio) } : {};
  const status = failed
    ? (part.expected?.count ?? 1) > 1
      ? "Couldn't make these images."
      : "Couldn't make this image."
    : generating
      ? null
      : `Made ${label}`;

  return (
    <GeneratedImagesContext.Provider
      value={{
        seed,
        prompt: part.prompt,
        watched,
        onOpen,
        onDownload,
        onCopy,
      }}
    >
      <div
        data-slot="generated-images"
        data-state={part.state}
        className={cn(
          "flex max-w-2xl flex-col gap-2",
          // One image shows large: at most 512px (128 steps) wide, and never
          // taller than 520px (130 steps), so a tall one narrows instead of
          // becoming a column.
          single &&
            !failed &&
            "max-w-[min(calc(var(--spacing)*128),calc(var(--spacing)*130*var(--generated-images-ratio)))]",
          className,
        )}
        style={{ ...sizing, ...style }}
        {...props}
      >
        {/* Watched images keep the line once they land, now with the total,
            so the grid never jumps up when "Generating" goes. A failure
            changes the same line's text, so the live region announces it. */}
        {generating || watched || failed ? (
          <p
            data-slot="generated-images-status"
            className={cn(
              "m-0 flex gap-2 text-sm",
              failed
                ? "items-center rounded-lg bg-muted px-3 py-2 text-muted-foreground ring-1 ring-border"
                : "items-baseline",
            )}
          >
            {failed ? (
              <TriangleAlert
                aria-hidden
                className="size-4 shrink-0 text-destructive"
              />
            ) : null}
            <span role="status">
              {status ?? <ShimmerText>{`Generating ${label}`}</ShimmerText>}
            </span>
            {failed ? null : <Elapsed running={generating} />}
            {failed && onRetry !== undefined ? (
              <Button
                variant="outline"
                size="sm"
                className="ms-auto bg-background"
                onClick={onRetry}
              >
                <RotateCcw aria-hidden />
                Try again
              </Button>
            ) : null}
          </p>
        ) : null}
        {failed ? null : (
          <>
            <div
              data-slot="generated-images-grid"
              className={cn(
                "grid gap-1.5",
                single ? "grid-cols-1" : "grid-cols-2",
              )}
            >
              {Array.from({ length: slots }, (_, index) => {
                const image = generating ? undefined : part.images[index];
                if (image === undefined) {
                  return (
                    <GeneratedImagePlaceholder
                      key={`pending-${index}`}
                      width={expected.width}
                      height={expected.height}
                      index={index}
                    />
                  );
                }
                return (
                  <Fragment key={image.id}>
                    {renderImage === undefined ? (
                      <GeneratedImage image={image} index={index}>
                        {hasActions ? <GeneratedImageActions /> : null}
                      </GeneratedImage>
                    ) : (
                      renderImage(image, index)
                    )}
                  </Fragment>
                );
              })}
            </div>
            <p
              data-slot="generated-images-caption"
              className="m-0 line-clamp-2 text-xs text-muted-foreground"
            >
              {part.prompt}
            </p>
          </>
        )}
      </div>
    </GeneratedImagesContext.Provider>
  );
}

/**
 * How long the images took, as m:ss: counting while they are made, then
 * holding the total. Honest where a percentage would be invented, since an
 * image model reports no progress. Outside the live region, so it is not
 * announced every second.
 */
function Elapsed({ running }: { readonly running: boolean }) {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  const seconds = Math.floor((now - start) / 1000);
  return (
    <time
      dateTime={`PT${seconds}S`}
      data-slot="generated-images-elapsed"
      className="font-mono text-xs text-muted-foreground tabular-nums"
    >
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </time>
  );
}

export type GeneratedImagePlaceholderProps = React.ComponentProps<"div"> & {
  /** The final image's size, so the placeholder holds its exact shape. */
  readonly width: number;
  readonly height: number;
  /** Which image of the part this will be; keeps its grain continuous into the image. */
  readonly index?: number;
};

/**
 * Where an image will land while it is made: the exact space it takes, filled
 * with the forming grain, and the size it will be. Hidden from assistive
 * technology; the status line says what is happening.
 */
export function GeneratedImagePlaceholder({
  width,
  height,
  index = 0,
  className,
  style,
  ...props
}: GeneratedImagePlaceholderProps) {
  const context = useContext(GeneratedImagesContext);
  return (
    <div
      aria-hidden
      data-slot="generated-image-placeholder"
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted ring-1 ring-border",
        className,
      )}
      style={{ aspectRatio: `${width} / ${height}`, ...style }}
      {...props}
    >
      <DitherField seed={(context?.seed ?? 0) + index} />
      <span className="absolute end-2 bottom-2 rounded-full bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
        {width} × {height}
      </span>
    </div>
  );
}

export type GeneratedImageProps = React.ComponentProps<"figure"> & {
  readonly image: ConversationImage;
  /** Its place in the part: what `onOpen` and the actions report. */
  readonly index: number;
};

/**
 * One finished image, inside `GeneratedImages`. With the root's `onOpen`, the
 * picture is a button that opens it. Made while watched, it stays under the
 * forming grain until it has loaded, then the grain reveals it; otherwise it
 * fades in once loaded. Children (usually `GeneratedImageActions`) sit over
 * its corner.
 */
export function GeneratedImage({
  image,
  index,
  className,
  style,
  children,
  ...props
}: GeneratedImageProps) {
  const { seed, prompt, watched, onOpen } =
    useGeneratedImagesContext("GeneratedImage");
  const reduce = usePrefersReducedMotion();
  const develop = watched && !reduce;
  const [developing, setDeveloping] = useState(develop);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const src = conversationImageSrc(image);
  const label = imageLabel(image, index, prompt);

  // A new address for the same tile is a new attempt: it loads afresh. The
  // browser keeps painting the old picture until then, so a watched tile
  // goes back under the grain.
  const [attempted, setAttempted] = useState(src);
  if (attempted !== src) {
    setAttempted(src);
    setLoaded(false);
    setFailed(false);
    setDeveloping(develop);
  }

  // An image that finished loading before React listened for `load` (a
  // cached one) would otherwise stay under the grain.
  useLayoutEffect(() => {
    const element = imageRef.current;
    if (element !== null && element.complete && element.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  const broken = failed || src === undefined;
  const picture = broken ? null : (
    <img
      ref={imageRef}
      src={src}
      alt={onOpen === undefined ? (image.alt ?? "") : ""}
      width={image.width}
      height={image.height}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={cn(
        "block size-full object-cover",
        develop
          ? "opacity-100"
          : "transition-[opacity,filter,scale] duration-500 ease-out motion-reduce:transition-opacity",
        !develop &&
          (loaded
            ? "blur-none opacity-100 scale-100"
            : "scale-105 opacity-0 blur-md motion-reduce:scale-100 motion-reduce:blur-none"),
      )}
    />
  );

  return (
    <GeneratedImageContext.Provider value={{ index, label, broken }}>
      <figure
        data-slot="generated-image"
        data-state={broken ? "error" : loaded ? "loaded" : "loading"}
        className={cn(
          "group/tile relative m-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border",
          className,
        )}
        style={{ aspectRatio: `${image.width} / ${image.height}`, ...style }}
        {...props}
      >
        {broken ? (
          <span className="absolute inset-0 grid place-items-center p-3 text-center text-xs text-muted-foreground">
            {`Couldn't load ${image.alt ?? "this image"}`}
          </span>
        ) : onOpen === undefined ? (
          picture
        ) : (
          <button
            type="button"
            aria-label={`Open ${label}`}
            data-slot="generated-image-open"
            className="block size-full cursor-zoom-in focus-visible:-outline-offset-2"
            onClick={(event) => onOpen(index, event.currentTarget)}
          >
            {picture}
          </button>
        )}
        {developing && !broken ? (
          <span
            aria-hidden
            data-slot="generated-image-grain"
            className="pointer-events-none absolute inset-0 z-10"
          >
            <DitherField
              seed={seed + index}
              reveal={
                loaded
                  ? {
                      delayMs: index * REVEAL_STAGGER_MS,
                      onDone: () => setDeveloping(false),
                    }
                  : undefined
              }
            />
          </span>
        ) : null}
        {children}
      </figure>
    </GeneratedImageContext.Provider>
  );
}

const ACTION =
  "grid size-7 place-items-center rounded-full bg-popover text-popover-foreground shadow-sm transition-colors hover:bg-muted [&_svg]:size-3.5";

export type GeneratedImageActionsProps = React.ComponentProps<"div">;

/**
 * Download, Copy and Open over a `GeneratedImage`'s corner, one for each of
 * `GeneratedImages`' `onDownload`, `onCopy` and `onOpen` that is given.
 * Shown on hover or focus, and always where there is no hover. Children add
 * further buttons after them. An image that could not be shown gets none of
 * the three, only the children.
 */
export function GeneratedImageActions({
  className,
  children,
  ...props
}: GeneratedImageActionsProps) {
  const { onOpen, onDownload, onCopy } = useGeneratedImagesContext(
    "GeneratedImageActions",
  );
  const tile = useContext(GeneratedImageContext);
  if (tile === null) {
    throw new Error("GeneratedImageActions must be inside GeneratedImage.");
  }
  const { index, label, broken } = tile;
  if (broken && (children === undefined || children === null)) return null;
  return (
    <div
      data-slot="generated-image-actions"
      className={cn(
        "absolute end-2 top-2 z-20 flex gap-1 opacity-0 transition-opacity",
        "group-hover/tile:opacity-100 group-focus-within/tile:opacity-100 [@media(hover:none)]:opacity-100",
        className,
      )}
      {...props}
    >
      {broken || onDownload === undefined ? null : (
        <button
          type="button"
          aria-label={`Download ${label}`}
          className={ACTION}
          onClick={() => onDownload(index)}
        >
          <Download aria-hidden />
        </button>
      )}
      {broken || onCopy === undefined ? null : (
        <button
          type="button"
          aria-label={`Copy ${label}`}
          className={ACTION}
          onClick={() => onCopy(index)}
        >
          <Copy aria-hidden />
        </button>
      )}
      {broken || onOpen === undefined ? null : (
        <button
          type="button"
          aria-label={`Open ${label} full size`}
          className={ACTION}
          onClick={(event) => onOpen(index, event.currentTarget)}
        >
          <Maximize2 aria-hidden />
        </button>
      )}
      {children}
    </div>
  );
}
