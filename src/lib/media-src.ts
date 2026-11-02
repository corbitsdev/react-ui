import { isSafeUrl } from "./url.js";

/** Where a media sink may load from. */
export type MediaSink = "media" | "link";

const NETWORK_PROTOCOLS: readonly string[] = ["http:", "https:", "blob:"];

/** `data:` media types an `<img>`, `<video>` or `<audio>` may render. */
const DATA_MEDIA_TYPE = /^data:(image|video|audio)\/[a-z0-9.+-]+[;,]/i;

/**
 * `src` back if a media sink may load it, otherwise `undefined`.
 *
 * Image, video and audio elements (`"media"`) also accept a `data:` URL of
 * their own kind, since they never run what they load. A link (`"link"`)
 * takes only `http:`, `https:` and `blob:`: it opens what it points at as a
 * document, and a `data:` document, an SVG image among them, runs script.
 */
export function safeMediaSrc(src: string, sink: MediaSink): string | undefined {
  if (sink === "media" && DATA_MEDIA_TYPE.test(src)) return src;
  return isSafeUrl(src, NETWORK_PROTOCOLS) ? src : undefined;
}
