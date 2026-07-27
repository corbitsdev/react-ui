/**
 * The shape an artifact surface renders.
 *
 * Deliberately not a mirror of any producer's row type: the registry has no
 * backend, so this is the projection a viewer actually needs — an identity, a
 * name, a kind, a payload, and enough provenance to caption a tile. Map your
 * own record onto it at the edge of your app and the whole artifacts family
 * works unchanged.
 */
export type Artifact = {
  readonly id: string;
  readonly title: string;
  /**
   * Open vocabulary, owned by whatever produced the artifact — "one-pager",
   * "csv-export", "deck". It is a plain string rather than a union because the
   * registry cannot know your kinds, and a union here would force every
   * consumer to fork this file on their first new kind.
   */
  readonly kind: string;
  /**
   * The payload. Prose kinds carry text, embed kinds carry a URL, structured
   * kinds carry JSON. Empty is a legitimate value — see `pending`.
   */
  readonly content: string;
  readonly createdAt: string;
  readonly updatedAt?: string;
  readonly ownerName?: string;
  /**
   * The producer is still writing this one. An empty `content` means "not
   * written yet" rather than "broken", and the viewer must say which — an
   * artifact that reads as damaged while it is merely mid-generation is the
   * single most common false alarm on this surface.
   */
  readonly pending?: boolean;
  /** A preview image the host can serve, when it has one. */
  readonly thumbnailUrl?: string;
  /** The original bytes, when the host exposes a download route. */
  readonly downloadUrl?: string;
};

/**
 * How an artifact should be *drawn*, as opposed to what it is called.
 *
 * A closed union, unlike `kind`: there are only so many ways to present a
 * payload, and every one of them is a component in this registry. Kinds
 * multiply; forms do not.
 */
export type ArtifactForm =
  | "prose"
  | "table"
  | "comparison"
  | "research"
  | "embed"
  | "image"
  | "download";

const FORM_BY_SUFFIX: readonly (readonly [RegExp, ArtifactForm])[] = [
  [/(^|-)csv(-|$)|(^|-)sheet(-|$)|(^|-)table(-|$)/, "table"],
  [/(^|-)comparison(-|$)|(^|-)compare(-|$)|^ab-/, "comparison"],
  [/(^|-)research(-|$)|(^|-)brief(-|$)/, "research"],
  [/(^|-)deck(-|$)|(^|-)presentation(-|$)|(^|-)slides(-|$)|(^|-)embed(-|$)/, "embed"],
  [/(^|-)image(-|$)|(^|-)photo(-|$)|(^|-)screenshot(-|$)/, "image"],
  [/(^|-)file(-|$)|(^|-)upload(-|$)|(^|-)binary(-|$)/, "download"],
];

/**
 * Guesses a form from a kind string, defaulting to prose.
 *
 * **This is the function you edit.** It is a plain lookup, not a plugin
 * registry, precisely because you own this file once `shadcn add` copies it —
 * adding a kind should be one line here, readable at a glance, not a
 * registration call into machinery you have to go read. The regexes cover the
 * naming conventions kinds usually arrive with; replace them with an explicit
 * `Record<string, ArtifactForm>` the moment your vocabulary is closed enough to
 * enumerate, which is strictly better than pattern-matching once you can.
 *
 * Prose is the default because it is the only form that cannot mislead: text
 * rendered as text is always honest, whereas a non-tabular payload forced into
 * a grid silently shifts cells into the wrong columns.
 */
export function artifactForm(kind: string): ArtifactForm {
  const normalized = kind.trim().toLowerCase();
  for (const [pattern, form] of FORM_BY_SUFFIX) {
    if (pattern.test(normalized)) return form;
  }
  return "prose";
}

/**
 * "sales-one-pager" → "Sales one pager".
 *
 * Derived rather than looked up: a hand-maintained label map goes stale the
 * first time a producer ships a kind nobody told the UI about, and an unlabelled
 * tile is worse than a mechanically-titled one. Pass your own labels through
 * the `kindLabel` prop where a surface offers it if you need better copy.
 */
export function artifactKindLabel(kind: string): string {
  const words = kind.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (words === "") return "Artifact";
  return words.charAt(0).toUpperCase() + words.slice(1);
}
