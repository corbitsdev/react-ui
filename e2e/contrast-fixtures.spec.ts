import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { contrastSamples } from "./contrast-dom.js";
import { judgeContrast, type ContrastVerdict } from "./contrast.js";

// The stories sweep's contrast fallback on hand-built pages: each fixture is
// text axe leaves "incomplete", and the fallback must not vouch for any of it
// that renders below its floor.

const DARK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#111"/></svg>',
  );

const page = (body: string) =>
  `<!doctype html><html><body style="margin:0;font:14px/20px sans-serif;background:#fff">${body}</body></html>`;

// Lines 2-3 overflow a white card onto black: #555 on #000 is ~2.8:1.
const SPILL = `<div style="background:#000;padding:40px"><div style="background:#fff;height:22px;width:320px"><p id="t" style="margin:0;color:#555">On the card<br>Spills onto black<br>Also on black</p></div></div>`;

// The same markup where the sampler has to scroll to it first.
const placed = (markup: string) =>
  [
    ["in view", page(markup)],
    [
      "below the fold",
      page(
        `<div style="height:1500px"></div>${markup}<div style="height:400px"></div>`,
      ),
    ],
    [
      "inside nested scrollers",
      page(
        `<div style="height:300px;overflow:auto"><div style="height:500px"></div><div style="height:200px;overflow:auto"><div style="height:600px"></div>${markup}</div><div style="height:400px"></div></div>`,
      ),
    ],
  ] as const;

// A chip with its own white ground, rotated, whose later lines spill onto
// black: client rects bound the turned chip from outside.
const chip = (degrees: number, align: string) =>
  page(
    `<div style="background:#000;padding:200px 80px"><p id="t" style="margin:0;background:#fff;height:22px;width:500px;text-align:${align};color:#555;transform:rotate(${degrees}deg)">On the chip<br>Spills onto black<br>Also on black</p></div>`,
  );

/** The fallback's verdict on #t, and whether axe left #t incomplete. */
async function verdictFor(
  tab: Page,
  html: string,
): Promise<{ incomplete: boolean; verdict: ContrastVerdict }> {
  await tab.setContent(html);
  const { incomplete } = await new AxeBuilder({ page: tab })
    .withRules(["color-contrast"])
    .analyze();
  const [sample = null] = await contrastSamples(tab, ["#t"], []);
  return {
    incomplete: incomplete
      .flatMap((result) => result.nodes)
      .some((node) => node.target[0] === "#t"),
    verdict: judgeContrast(sample),
  };
}

const NOT_VOUCHED = [
  ...placed(SPILL).map(
    ([where, html]) =>
      [
        `text overflowing its card onto another surface, ${where}`,
        html,
      ] as const,
  ),
  ["a rotated chip's text spilling off it (10deg, left)", chip(10, "left")],
  ["a rotated chip's text spilling off it (-10deg, right)", chip(-10, "right")],
  // The glyphs are painted by the #ddd-#eee gradient, not by color.
  [
    "gradient text through -webkit-text-fill-color",
    page(
      `<p id="t" style="color:#000;-webkit-text-fill-color:transparent;background-image:linear-gradient(90deg,#ddd,#eee);background-clip:text;-webkit-background-clip:text;display:inline-block">Generating 2 images</p>`,
    ),
  ],
  [
    "a pointer-events:none wash over an image",
    page(
      `<div style="position:relative;width:300px;height:60px"><img src="${DARK}" style="position:absolute;inset:0;width:100%;height:100%"><div style="position:absolute;inset:0;background:rgba(255,255,255,.5);pointer-events:none"></div><span id="t" style="position:relative;color:#767676">Caption</span></div>`,
    ),
  ],
  [
    "an ancestor ::before painting an image",
    page(
      `<style>.c{position:relative;width:300px;padding:10px}.c::before{content:"";position:absolute;inset:0;background:url('${DARK}');pointer-events:none}</style><div class="c"><span id="t" style="position:relative;color:#767676">Caption</span></div>`,
    ),
  ],
] as const;

for (const [name, html] of NOT_VOUCHED)
  test(`the contrast fallback does not pass ${name}`, async ({ page: tab }) => {
    const { incomplete, verdict } = await verdictFor(tab, html);
    expect(incomplete).toBe(true);
    expect(verdict).not.toMatchObject({ kind: "measured", pass: true });
  });

// The inset shadow paints #000 over the white the text would be judged on.
// Axe settles this page itself, so only the fallback's verdict is pinned.
test("the contrast fallback does not pass text on an opaque ground under an inset shadow", async ({
  page: tab,
}) => {
  const { verdict } = await verdictFor(
    tab,
    page(
      `<p id="t" style="color:#333;background:#fff;box-shadow:inset 0 0 0 80px #000;padding:8px">Pending approval</p>`,
    ),
  );
  expect(verdict).not.toMatchObject({ kind: "measured", pass: true });
});

// Controls: the same shapes with legible text still measure, so the
// fixtures above fail for the reason they name.
const VOUCHED = [
  [
    "text that stays on its card",
    page(
      `<div style="background:#000;padding:40px"><div style="background:#fff;height:62px;width:320px"><p id="t" style="margin:0;color:#555">On the card<br>Still on the card<br>Also on the card</p></div></div>`,
    ),
  ],
  [
    "dark gradient text through -webkit-text-fill-color",
    page(
      `<p id="t" style="color:#fff;-webkit-text-fill-color:transparent;background-image:linear-gradient(90deg,#333,#000);background-clip:text;-webkit-background-clip:text;display:inline-block">Generating 2 images</p>`,
    ),
  ],
  [
    "text under an empty stretched button",
    page(
      `<div style="position:relative;width:200px;background:#fff"><span id="t" style="color:#555">quarter-plan.pdf</span><button aria-label="Open" style="position:absolute;inset:0;background:none;border:0"></button></div>`,
    ),
  ],
] as const;

for (const [name, html] of VOUCHED)
  test(`the contrast fallback measures ${name}`, async ({ page: tab }) => {
    const { verdict } = await verdictFor(tab, html);
    expect(verdict).toMatchObject({ kind: "measured", pass: true });
  });

// The verdict does not depend on where the text starts: every geometry read
// happens where the sampler scrolled it to.
const SAME_ANYWHERE = [
  ["text overflowing its card", SPILL],
  [
    "text on its own faint wash",
    `<div style="background:#fff;padding:20px"><span id="t" style="color:#767676;background:rgba(0,0,0,.02)">Caption on a wash</span></div>`,
  ],
  [
    "text that stays on its card",
    `<div style="background:#000;padding:40px"><div style="background:#fff;height:62px;width:320px"><p id="t" style="margin:0;color:#555">On the card<br>Still on the card<br>Also on the card</p></div></div>`,
  ],
] as const;

for (const [name, markup] of SAME_ANYWHERE)
  test(`the contrast fallback judges ${name} the same wherever it starts`, async ({
    page: tab,
  }) => {
    const verdicts: ContrastVerdict[] = [];
    for (const [, html] of placed(markup))
      verdicts.push((await verdictFor(tab, html)).verdict);
    const [inView] = verdicts;
    expect(inView?.kind).toBe("measured");
    for (const verdict of verdicts) expect(verdict).toEqual(inView);
  });
