import type { Page } from "@playwright/test";

type Watched = Window & {
  __bodyFocus?: { frames: number; stop: () => void };
};

/**
 * Starts checking, every frame, whether focus has fallen to the page (no
 * element, or `<body>`). The returned function stops and resolves to how many
 * frames it had: zero means a reader never saw focus lost.
 */
export async function watchFocusOnBody(
  page: Page,
): Promise<() => Promise<number>> {
  await page.evaluate(() => {
    const watched = window as Watched;
    let frame = 0;
    const state = {
      frames: 0,
      stop: () => cancelAnimationFrame(frame),
    };
    const tick = () => {
      const active = document.activeElement;
      if (active === null || active === document.body) state.frames += 1;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    watched.__bodyFocus = state;
  });
  return () =>
    page.evaluate(() => {
      const state = (window as Watched).__bodyFocus;
      if (state === undefined) throw new Error("focus was not being watched");
      state.stop();
      return state.frames;
    });
}
