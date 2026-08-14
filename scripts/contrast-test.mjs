// WCAG contrast gate for the Corbits theme. Reads dist/styles.css — the
// stylesheet we actually publish — so it checks the shipped tokens rather than
// a copy of them. Runs as the last step of `bun run build`.
//
// The pairs are derived from token *names*, never listed by hex — add
// `--warning` / `--warning-foreground` to the theme and rule 1 covers it on the
// next run with no edit here. Both modes are checked every time.
//
// `REQUIRED` is the counterweight to that name-derivation. Deriving pairs from
// whatever names happen to be present means a token that *disappears* takes its
// own checks with it and the gate goes quiet instead of red — which is exactly
// how the `--chart-*` tokens were once dropped from the theme while this gate
// reported a clean run and printed no chart lines at all. A rule that can only
// be satisfied vacuously is not a gate. So the tokens the components actually
// reference are named here, and their absence is a failure.
import { readFileSync } from "node:fs";

const STYLESHEET = new URL("../dist/styles.css", import.meta.url).pathname;

/**
 * Tokens a component reads by name. Absence is a failure, not a skipped check.
 *
 * Presence is all this asserts. Most of these are colours and go on to be
 * measured below; `radius` is here because the theme layer is built on it, and
 * it is simply required to exist — there is no contrast ratio for a length.
 */
const REQUIRED = [
  "radius",
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "primary-active",
  "primary-emphasis",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "success",
  "success-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "ok",
  "warn",
  // Five slots, matching CHART_SERIES_SLOTS in lib/chart-palette.ts.
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
];

/** Hex custom properties declared in the first `selector { ... }` block found. */
function tokensIn(css, selector) {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`contrast-test: no \`${selector}\` block in dist/styles.css`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map(([, name, hex]) => [name, hex]),
  );
}

/** Every custom property declared in the block, whatever its value. */
function declaredIn(css, selector) {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  return new Set([...body.matchAll(/--([a-z0-9-]+):/g)].map(([, name]) => name));
}

const AA_TEXT = 4.5; // WCAG 1.4.3, normal-size text
const AA_UI = 3.0; // WCAG 1.4.11, boundaries of controls
const ELEVATION = 1.2; // house rule: a card must be visible against the page

const luminance = (hex) => {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const css = readFileSync(STYLESHEET, "utf8");
const light = tokensIn(css, ":root");
// `.dark` only overrides; anything it does not restate is inherited from :root.
const dark = { ...light, ...tokensIn(css, ".dark") };

if (Object.keys(light).length === 0) {
  console.error("contrast-test: no tokens found — did the stylesheet build?");
  process.exit(1);
}

// Presence only. Whether a token is a colour is a separate question — a
// non-colour token like `--radius` has to exist, but there is no ratio to
// compute for it, so it is asserted here and never reaches the maths below.
const declaredLight = declaredIn(css, ":root");
const declaredDark = new Set([...declaredLight, ...declaredIn(css, ".dark")]);

let missingTokens = 0;
for (const [mode, declared] of [
  ["light", declaredLight],
  ["dark", declaredDark],
]) {
  for (const name of REQUIRED) {
    if (declared.has(name)) continue;
    console.error(`MISSING  ${mode} --${name} is not defined in dist/styles.css`);
    missingTokens += 1;
  }
}
if (missingTokens > 0) {
  console.error(
    `\ncontrast-test: ${missingTokens} required token(s) missing. A component references ` +
      `these by name; an undefined custom property makes the whole declaration invalid at ` +
      `computed-value time, so the declaration is dropped and the element renders unstyled.`,
  );
  process.exit(1);
}

const SURFACES = ["background", "card", "popover", "muted"];

/** Every check, expressed against a mode's token record. */
function checksFor(tokens) {
  const has = (name) => typeof tokens[name] === "string" && tokens[name].startsWith("#");
  const checks = [];

  // 1. Every `X-foreground` must be readable on its own `X`.
  for (const name of Object.keys(tokens)) {
    const fill = name.replace(/-foreground$/, "");
    if (name.endsWith("-foreground") && has(name) && has(fill)) {
      checks.push([`${name} on ${fill}`, tokens[name], tokens[fill], AA_TEXT]);
    }
  }

  // 2. Body and secondary text must be readable on every surface they can land on.
  for (const text of ["foreground", "muted-foreground"]) {
    for (const surface of SURFACES) {
      if (has(text) && has(surface)) {
        checks.push([`${text} on ${surface}`, tokens[text], tokens[surface], AA_TEXT]);
      }
    }
  }

  // 3. Orange-as-text/border must clear text contrast on the surfaces it sits on.
  for (const surface of ["background", "card"]) {
    if (has("primary-emphasis") && has(surface)) {
      checks.push([`primary-emphasis on ${surface}`, tokens["primary-emphasis"], tokens[surface], AA_TEXT]);
    }
  }

  // 4. Control boundaries and the focus ring must clear the UI-component threshold.
  for (const line of ["input", "ring"]) {
    for (const surface of ["background", "card"]) {
      if (has(line) && has(surface)) {
        checks.push([`${line} against ${surface}`, tokens[line], tokens[surface], AA_UI]);
      }
    }
  }

  // 5. Chart series marks are UI, not text: a bar or a 2px line has to be
  //    distinguishable from whatever it is drawn on, which is the 3:1
  //    component threshold. Both surfaces, because a chart lands on the page as
  //    often as inside a card, and a series that only clears one of them is
  //    invisible on the other. Matched by name, so a sixth series is covered on
  //    the next run with no edit here.
  //
  //    This gate is the WCAG half of the story. The palette's own gates —
  //    lightness band, chroma floor, colour-vision separation — are the dataviz
  //    standard's, checked with its validator when the steps are chosen; they
  //    cannot be re-derived from hex pairs, which is why they are not here.
  for (const name of Object.keys(tokens)) {
    if (!/^chart-\d+$/.test(name) || !has(name)) continue;
    for (const surface of ["background", "card"]) {
      if (has(surface)) {
        checks.push([`${name} against ${surface}`, tokens[name], tokens[surface], AA_UI]);
      }
    }
  }

  // 6. A card must be separable from the page. On a black ground that comes
  //    from the fill; on a white ground a raised surface has nowhere lighter to
  //    go, so it comes from the edge. Either carrier satisfies the rule — what
  //    is not allowed is a card that reads as page in both.
  if (has("card") && has("background") && has("border")) {
    const byFill = ratio(tokens["card"], tokens["background"]);
    const byEdge = ratio(tokens["border"], tokens["background"]);
    checks.push([
      `card separable from background (fill ${byFill.toFixed(2)}, edge ${byEdge.toFixed(2)})`,
      byFill >= byEdge ? tokens["card"] : tokens["border"],
      tokens["background"],
      ELEVATION,
    ]);
  }

  return checks;
}

let failed = 0;
for (const [mode, tokens] of [
  ["light", light],
  ["dark", dark],
]) {
  for (const [label, a, b, floor] of checksFor(tokens)) {
    const measured = ratio(a, b);
    const ok = measured >= floor;
    if (!ok) failed += 1;
    const line = `${ok ? "ok  " : "FAIL"} ${measured.toFixed(2).padStart(6)}:1 (>=${floor})  ${mode} ${label}`;
    if (ok) console.log(line);
    else console.error(line);
  }
}

if (failed > 0) {
  console.error(`\ncontrast-test: ${failed} failing pair(s)`);
  process.exit(1);
}
console.log("\ncontrast-test: all pairs pass in light and dark");
