/** A mention names someone to address; a command names something to run. */
export type PromptTokenKind = "mention" | "command";

/** Something a prompt completes and highlights: an agent to mention or a
 * command to run. */
export type PromptToken = {
  readonly id: string;
  readonly kind: PromptTokenKind;
  /** Exactly as it lands in the text: "@Ada", "/summarize". */
  readonly token: string;
  /** Shown beside the token in a suggestion list. */
  readonly detail?: string;
};

/** The `@` or `/` token the caret is in, as typed so far. */
export type ActivePromptToken = {
  readonly kind: PromptTokenKind;
  /** The characters after the trigger, without it: "ad" for "@ad". */
  readonly query: string;
  /** Index of the trigger character. */
  readonly start: number;
  /** Index just past the token's last character. */
  readonly end: number;
};

/** A run of prompt text: plain, or one known token. */
export type PromptSegment = {
  readonly text: string;
  readonly token?: PromptToken;
};

const WORD_CHARACTER = /[\p{L}\p{N}_-]/u;
const WHITESPACE = /\s/u;
const SPACE_IN_LINE = /[^\S\n\r]/u;

function isWordCharacter(character: string): boolean {
  return character !== "" && WORD_CHARACTER.test(character);
}

/**
 * Whether a token of `kind` may begin at `index`. A mention starts a word, so
 * the `@` in "name@example.com" is not one; a command starts a line, so a
 * `/` mid-sentence ("and/or") is not one either.
 */
function canStartAt(value: string, index: number, kind: PromptTokenKind) {
  if (index === 0) return true;
  const before = value.charAt(index - 1);
  return kind === "command" ? before === "\n" : WHITESPACE.test(before);
}

/**
 * Finds the `@mention` or `/command` the caret is in. The token runs from its
 * trigger through the word characters on both sides of the caret, so a caret
 * in the middle of "@ad" still finds it. Returns `null` when the caret is not
 * in a token.
 */
export function findActivePromptToken(
  value: string,
  caret: number,
): ActivePromptToken | null {
  if (caret < 0 || caret > value.length) return null;
  let wordStart = caret;
  while (wordStart > 0 && isWordCharacter(value.charAt(wordStart - 1))) {
    wordStart -= 1;
  }
  const start = wordStart - 1;
  if (start < 0) return null;
  const trigger = value.charAt(start);
  const kind =
    trigger === "@" ? "mention" : trigger === "/" ? "command" : undefined;
  if (kind === undefined || !canStartAt(value, start, kind)) return null;
  let end = caret;
  while (end < value.length && isWordCharacter(value.charAt(end))) end += 1;
  return { kind, query: value.slice(wordStart, end), start, end };
}

/** The tokens of the active token's kind that begin with what is typed,
 * ignoring case, in their given order. */
export function matchPromptTokens(
  tokens: readonly PromptToken[],
  active: ActivePromptToken,
): readonly PromptToken[] {
  const trigger = active.kind === "mention" ? "@" : "/";
  const typed = `${trigger}${active.query}`.toLowerCase();
  return tokens.filter(
    (token) =>
      token.kind === active.kind && token.token.toLowerCase().startsWith(typed),
  );
}

/**
 * The text with the active token replaced by `token` and a space after it,
 * and where the caret goes: past that space, so it leaves the token and the
 * list closes. A space that already follows is reused rather than doubled; a
 * line break is not, or the caret would land on the next line.
 */
export function insertPromptToken(
  value: string,
  active: ActivePromptToken,
  token: PromptToken,
): { readonly value: string; readonly caret: number } {
  const after = value.slice(active.end);
  const spaced = SPACE_IN_LINE.test(after.charAt(0));
  const inserted = spaced ? token.token : `${token.token} `;
  return {
    value: `${value.slice(0, active.start)}${inserted}${after}`,
    caret: active.start + token.token.length + 1,
  };
}

/**
 * Splits prompt text into plain runs and known tokens. A token counts only as
 * a whole word where its kind may start (see `findActivePromptToken`): "@Ada"
 * in "@Ada, can you", not in "@Adam" or "x@Ada". Longer tokens win, so
 * "@Ada Lovelace" is found before "@Ada". An empty token matches nothing.
 */
export function splitPromptSegments(
  value: string,
  tokens: readonly PromptToken[],
): readonly PromptSegment[] {
  const longestFirst = tokens
    .filter((token) => token.token !== "")
    .sort((a, b) => b.token.length - a.token.length);
  const segments: PromptSegment[] = [];
  let runStart = 0;
  let index = 0;
  while (index < value.length) {
    const hit = longestFirst.find(
      (token) =>
        value.startsWith(token.token, index) &&
        canStartAt(value, index, token.kind) &&
        !isWordCharacter(value.charAt(index + token.token.length)),
    );
    if (hit === undefined) {
      index += 1;
      continue;
    }
    if (index > runStart) segments.push({ text: value.slice(runStart, index) });
    segments.push({ text: hit.token, token: hit });
    index += hit.token.length;
    runStart = index;
  }
  if (runStart < value.length) segments.push({ text: value.slice(runStart) });
  return segments;
}
