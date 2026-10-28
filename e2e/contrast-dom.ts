import type { Page } from "@playwright/test";

import type {
  ClippedBackground,
  ContrastLayer,
  ContrastSample,
  PaintEntry,
} from "./contrast.js";

// Reads, in the browser, what e2e/contrast.ts judges: the colours, layers and
// hit-test stacks of text axe leaves "incomplete".

/**
 * The glyph colours and every layer from each element out to the root,
 * resolved by the browser, with the hit-test stack at points across the
 * text so paint outside those layers is found, and so each point is
 * measured only on the boxes under it. `judged` lists the selectors of every
 * node axe's color-contrast rule judged on the page. `null` where an element or
 * ancestor paints in a way the layers cannot follow: a filter, a blend mode,
 * or a clipped background that is not one plain gradient. A mask is not
 * followed: like axe, the layers take it as fully opaque.
 */
export async function contrastSamples(
  page: Page,
  selectors: readonly string[],
  judged: readonly string[],
): Promise<readonly (ContrastSample | null)[]> {
  return page.evaluate(
    ([targets, judgedSelectors]) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context === null) return targets.map(() => null);
      // Paints the computed colour, whatever syntax it computes to
      // (color(srgb …) from color-mix, oklab, rgb), and reads it back as sRGB.
      const resolve = (color: string): [number, number, number, number] => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(
          0,
          0,
          1,
          1,
        ).data;
        return [r, g, b, a / 255];
      };
      const masked = (style: CSSStyleDeclaration) =>
        style.maskImage !== "none" ||
        (style.getPropertyValue("-webkit-mask-image") || "none") !== "none";
      // Nothing on the way to the root fades, filters, blends or masks it.
      const unfaded = (element: Element) => {
        for (
          let node: Element | null = element;
          node;
          node = node.parentElement
        ) {
          const style = getComputedStyle(node);
          if (
            Number(style.opacity) < 1 ||
            style.filter !== "none" ||
            style.mixBlendMode !== "normal" ||
            masked(style)
          )
            return false;
        }
        return true;
      };
      const clipsText = (style: CSSStyleDeclaration) =>
        style.backgroundClip === "text" ||
        style.getPropertyValue("-webkit-background-clip") === "text";
      const REPLACED = new Set([
        "IMG",
        "CANVAS",
        "VIDEO",
        "IFRAME",
        "EMBED",
        "OBJECT",
        "INPUT",
        "TEXTAREA",
        "SELECT",
      ]);
      const visibleLine = (width: string, style: string, color: string) =>
        Number.parseFloat(width) > 0 &&
        style !== "none" &&
        style !== "hidden" &&
        resolve(color)[3] > 0;
      // Hit-testing still finds what `opacity: 0` hides.
      const transparent = (element: Element) => {
        for (
          let node: Element | null = element;
          node;
          node = node.parentElement
        )
          if (Number(getComputedStyle(node).opacity) === 0) return true;
        return false;
      };
      // Text with a glyph to paint, not only spaces or zero-width characters.
      const glyphs = (text: string | null) =>
        (text ?? "").replace(/[\s\u200b-\u200d\u2060\ufeff]/g, "") !== "";
      const ownGlyphs = (element: Element) =>
        [...element.childNodes].some(
          (child) =>
            child.nodeType === Node.TEXT_NODE && glyphs(child.textContent),
        );
      // An element's own box at a hit point, its pseudo-elements aside.
      const paintOf = (element: Element): PaintEntry["paint"] => {
        if (transparent(element)) return "none";
        const style = getComputedStyle(element);
        // An inset shadow paints over the colour, so the colour is not the ground.
        if (
          resolve(style.backgroundColor)[3] === 1 &&
          style.backgroundClip === "border-box" &&
          !style.boxShadow.includes("inset") &&
          unfaded(element)
        )
          return "solid";
        const sides = ["top", "right", "bottom", "left"] as const;
        const paints =
          element instanceof SVGElement ||
          REPLACED.has(element.tagName) ||
          ownGlyphs(element) ||
          resolve(style.backgroundColor)[3] > 0 ||
          style.backgroundImage !== "none" ||
          style.backdropFilter !== "none" ||
          style.boxShadow.includes("inset") ||
          sides.some((side) =>
            visibleLine(
              style.getPropertyValue(`border-${side}-width`),
              style.getPropertyValue(`border-${side}-style`),
              style.getPropertyValue(`border-${side}-color`),
            ),
          ) ||
          visibleLine(
            style.outlineWidth,
            style.outlineStyle,
            style.outlineColor,
          ) ||
          (style.display === "list-item" && style.listStyleType !== "none");
        return paints ? "some" : "none";
      };
      // Whether either pseudo-element paints anything at all.
      const pseudoPaints = (element: Element) =>
        !transparent(element) &&
        ["::before", "::after"].some((pseudo) => {
          const style = getComputedStyle(element, pseudo);
          if (
            style.content === "none" ||
            style.content === "normal" ||
            style.display === "none" ||
            style.visibility === "hidden"
          )
            return false;
          return (
            style.content !== '""' ||
            resolve(style.backgroundColor)[3] > 0 ||
            style.backgroundImage !== "none" ||
            style.backdropFilter !== "none" ||
            style.boxShadow !== "none" ||
            resolve(style.borderColor)[3] > 0 ||
            style.outlineStyle !== "none"
          );
        });
      // Rectangles of the element's own text, or its box for a form field.
      const textRects = (element: Element): DOMRect[] => {
        const rects: DOMRect[] = [];
        for (const child of element.childNodes) {
          if (child.nodeType !== Node.TEXT_NODE || !glyphs(child.textContent))
            continue;
          const range = document.createRange();
          range.selectNodeContents(child);
          rects.push(...range.getClientRects());
        }
        return rects.length > 0 ? rects : [...element.getClientRects()];
      };
      // Every element hit-testable, pseudo-elements included; then only
      // pseudo-elements, which hit as the element that owns them.
      const everything = document.createElement("style");
      everything.textContent =
        "*, *::before, *::after { pointer-events: auto !important; }";
      const pseudoOnly = document.createElement("style");
      pseudoOnly.textContent =
        "* { pointer-events: none !important; } *::before, *::after { pointer-events: auto !important; }";

      // Elements whose text axe's color-contrast judges in its own right.
      const judgedElements = new Set(
        judgedSelectors.flatMap((selector) => {
          const element = document.querySelector(selector);
          return element === null ? [] : [element];
        }),
      );

      // The paint stacks at points across the text, and every other element
      // drawing glyphs under it.
      const pointsOf = (
        element: Element,
        depth: ReadonlyMap<Element, number>,
      ): { points: PaintEntry[][]; drawers: Set<Element> } => {
        // The text element is hit wherever its glyphs are, so only its box
        // tells whether its own paint is under a point; that box is exact
        // only while nothing on the way to the root rotates, scales or
        // skews it.
        const turned = (() => {
          for (
            let node: Element | null = element;
            node;
            node = node.parentElement
          ) {
            const style = getComputedStyle(node);
            if (style.rotate !== "none" || style.scale !== "none") return true;
            if (style.transform === "none") continue;
            const matrix = new DOMMatrix(style.transform);
            matrix.m41 = 0;
            matrix.m42 = 0;
            matrix.m43 = 0;
            if (!matrix.isIdentity) return true;
          }
          return false;
        })();
        const own = getComputedStyle(element);
        const paintsOwnBox =
          (!clipsText(own) &&
            (resolve(own.backgroundColor)[3] > 0 ||
              own.backgroundImage !== "none")) ||
          own.backdropFilter !== "none";
        const scrolled: [Element, number, number][] = [];
        for (let node = element.parentElement; node; node = node.parentElement)
          scrolled.push([node, node.scrollLeft, node.scrollTop]);
        const [x, y] = [window.scrollX, window.scrollY];
        // Text an overflow scroller holds out of view shows once scrolled to.
        element.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "instant",
        });
        const spots: [number, number][] = [];
        for (const rect of textRects(element))
          for (const fx of [0.1, 0.3, 0.5, 0.7, 0.9])
            for (const fy of [0.3, 0.5, 0.7])
              spots.push([
                rect.left + rect.width * fx,
                rect.top + rect.height * fy,
              ]);
        document.head.append(everything);
        const stacks = spots.map(([px, py]) =>
          document.elementsFromPoint(px, py),
        );
        everything.remove();
        document.head.append(pseudoOnly);
        const pseudos = spots.map(([px, py]) =>
          document.elementsFromPoint(px, py),
        );
        pseudoOnly.remove();
        const drawers = new Set<Element>();
        const points = stacks.map((stack, index) => {
          const [px = 0, py = 0] = spots[index] ?? [];
          // Hit, and its own box holds the point: text overflowing its own
          // box still hits it. Client rects bound a rotated or skewed box
          // from outside, so for one they can say "holds" where it does not.
          const holds = (node: Element) =>
            [...node.getClientRects()].some(
              (rect) =>
                px >= rect.left &&
                px <= rect.right &&
                py >= rect.top &&
                py <= rect.bottom,
            );
          const pseudoHits = new Set(pseudos[index]);
          const textAt = stack.indexOf(element);
          if (textAt !== -1)
            for (const node of stack.slice(textAt + 1))
              if (
                !node.contains(element) &&
                ownGlyphs(node) &&
                !transparent(node)
              )
                drawers.add(node);
          const entries: (PaintEntry & { unsure?: true })[] = stack.map(
            (node, at) => {
              if (node === element) {
                if (!holds(node)) return { role: "text", paint: "none" };
                // Its own paint may or may not lie under the point.
                if (turned && paintsOwnBox)
                  return { role: "text", paint: "none", unsure: true };
                const paint = paintOf(node);
                return {
                  role: "text",
                  paint: paint === "solid" ? "solid" : "none",
                  box: 0,
                };
              }
              if (node.contains(element)) {
                // Above its own text, an ancestor is hit through a pseudo-element.
                if (at < textAt)
                  return pseudoHits.has(node) && !pseudoPaints(node)
                    ? { role: "other", paint: "none" }
                    : { role: "ancestor", paint: "some" };
                if (!holds(node)) return { role: "ancestor", paint: "none" };
                const paint = paintOf(node);
                return {
                  role: "ancestor",
                  paint: paint === "solid" ? "solid" : "none",
                  box: depth.get(node) ?? -1,
                };
              }
              return { role: "other", paint: paintOf(node) };
            },
          );
          // Where the text's own paint is unsure, it is paint the layers
          // cannot place: as if right under the text.
          const unsure = entries.findIndex((entry) => entry.unsure === true);
          if (unsure !== -1)
            entries.splice(
              unsure,
              1,
              { role: "text", paint: "none" },
              {
                role: "other",
                paint: "some",
              },
            );
          // A painting pseudo-element at this point, in an unknown place in
          // the stack: as if right under the text.
          if (
            textAt !== -1 &&
            [...pseudoHits].some((node) => pseudoPaints(node))
          )
            entries.splice(textAt + 1, 0, { role: "other", paint: "some" });
          return entries;
        });
        // Only now, with every geometry read taken where the text was
        // scrolled to. Instant, so `scroll-behavior: smooth` cannot leave a
        // scroller mid-animation for the next target to save.
        for (const [node, left, top] of scrolled)
          if (node.scrollLeft !== left || node.scrollTop !== top)
            node.scrollTo({ left, top, behavior: "instant" });
        window.scrollTo({ left: x, top: y, behavior: "instant" });
        return { points, drawers };
      };

      return targets.map((selector) => {
        const element = document.querySelector(selector);
        if (element === null) return null;
        // How many ancestors out from the text each element is: its `box`.
        const depth = new Map<Element, number>();
        for (
          let node: Element | null = element, at = 0;
          node !== null;
          node = node.parentElement, at++
        )
          depth.set(node, at);
        const own = getComputedStyle(element);
        // A clipped background is the glyphs' fill, not a layer under them.
        let clip: ClippedBackground | undefined;
        if (clipsText(own)) {
          const image = own.backgroundImage;
          const gradients = image.match(/gradient\(/g)?.length ?? 0;
          if (
            image !== "none" &&
            (gradients !== 1 ||
              /url\(|color-mix\(|light-dark\(|currentcolor|\sin\s/i.test(image))
          )
            return null;
          const stops =
            image === "none"
              ? []
              : (image.match(
                  /(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)|#[0-9a-f]{3,8}\b|\btransparent\b/gi,
                ) ?? []);
          clip = {
            color: resolve(own.backgroundColor),
            stops: stops.map(resolve),
          };
        }
        const layers: ContrastLayer[] = [];
        for (
          let node: Element | null = element, box = 0;
          node !== null;
          node = node.parentElement, box++
        ) {
          const style = getComputedStyle(node);
          if (style.filter !== "none" || style.mixBlendMode !== "normal")
            return null;
          // A node's inset shadow paints over its image, and its image over
          // its colour; its backdrop filter works on what is behind it; its
          // opacity fades all of it.
          if (style.boxShadow.includes("inset"))
            layers.push({ kind: "unresolved", box });
          if (!(node === element && clip !== undefined)) {
            if (style.backgroundImage !== "none")
              layers.push({ kind: "unresolved", box });
            const color = resolve(style.backgroundColor);
            if (color[3] > 0) layers.push({ kind: "background", color, box });
          }
          if (style.backdropFilter !== "none")
            layers.push({ kind: "unresolved", box });
          const opacity = Number(style.opacity);
          if (opacity < 1) layers.push({ kind: "opacity", value: opacity });
        }
        // An empty field shows its placeholder in the placeholder's colour.
        const placeholder =
          (element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement) &&
          element.value === "" &&
          element.placeholder !== "";
        const lettering = placeholder
          ? getComputedStyle(element, "::placeholder")
          : own;
        const text = resolve(lettering.color);
        // Computes to `color` unless set.
        const fill = resolve(
          lettering.getPropertyValue("-webkit-text-fill-color") ||
            lettering.color,
        );
        const stroke = {
          width: Number.parseFloat(
            lettering.getPropertyValue("-webkit-text-stroke-width") || "0",
          ),
          color: resolve(
            lettering.getPropertyValue("-webkit-text-stroke-color") ||
              "transparent",
          ),
        };
        const { points, drawers } = pointsOf(element, depth);
        return {
          text,
          fill,
          stroke,
          ...(clip === undefined ? {} : { clip }),
          mirrored:
            drawers.size > 0 &&
            [...drawers].every((drawer) => judgedElements.has(drawer)),
          layers,
          points,
          fontSizePx: Number.parseFloat(own.fontSize),
          fontWeight: Number(own.fontWeight),
        };
      });
    },
    [selectors, judged] as const,
  );
}
