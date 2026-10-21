/** What a file is, for how it previews. */
export type MediaKind = "image" | "video" | "audio" | "pdf" | "text" | "other";

const EXTENSION_KINDS: ReadonlyMap<string, MediaKind> = new Map([
  ...table("image", [
    "apng",
    "avif",
    "bmp",
    "gif",
    "heic",
    "heif",
    "ico",
    "jpeg",
    "jpg",
    "png",
    "svg",
    "tif",
    "tiff",
    "webp",
  ]),
  ...table("video", ["avi", "m4v", "mkv", "mov", "mp4", "mpeg", "ogv", "webm"]),
  ...table("audio", [
    "aac",
    "flac",
    "m4a",
    "mp3",
    "oga",
    "ogg",
    "opus",
    "wav",
    "weba",
  ]),
  ["pdf", "pdf"] as const,
  ...table("text", [
    "c",
    "cpp",
    "css",
    "csv",
    "go",
    "h",
    "html",
    "ini",
    "java",
    "js",
    "json",
    "jsx",
    "log",
    "md",
    "markdown",
    "py",
    "rb",
    "rs",
    "sh",
    "sql",
    "toml",
    "ts",
    "tsv",
    "tsx",
    "txt",
    "xml",
    "yaml",
    "yml",
  ]),
]);

/** Text media types outside `text/*`. */
const TEXT_MEDIA_TYPES: ReadonlySet<string> = new Set([
  "application/javascript",
  "application/json",
  "application/ld+json",
  "application/toml",
  "application/x-sh",
  "application/xml",
  "application/yaml",
]);

function table(
  kind: MediaKind,
  extensions: readonly string[],
): readonly (readonly [string, MediaKind])[] {
  return extensions.map((extension) => [extension, kind] as const);
}

function kindOfMediaType(mediaType: string): MediaKind | null {
  const essence = mediaType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (essence.startsWith("image/")) return "image";
  if (essence.startsWith("video/")) return "video";
  if (essence.startsWith("audio/")) return "audio";
  if (essence === "application/pdf") return "pdf";
  if (essence.startsWith("text/") || TEXT_MEDIA_TYPES.has(essence)) {
    return "text";
  }
  return null;
}

function kindOfName(name: string): MediaKind | null {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return null;
  const extension = name.slice(dot + 1).toLowerCase();
  return EXTENSION_KINDS.get(extension) ?? null;
}

/**
 * A file's kind from its name and media type. A media type that names a kind
 * wins; a blank or generic one (`application/octet-stream`) defers to the
 * name's extension, matched case-insensitively. Anything unrecognised is
 * `other`.
 */
export function mediaKindOf(name: string, mediaType: string): MediaKind {
  return kindOfMediaType(mediaType) ?? kindOfName(name) ?? "other";
}
