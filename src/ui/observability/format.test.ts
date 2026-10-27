import { describe, expect, test } from "bun:test";

import {
  formatReportedCost,
  formatStarted,
  formatStepCount,
} from "./format.js";

describe("formatReportedCost", () => {
  test("is a dash when no span reports a cost", () => {
    expect(formatReportedCost([{}, { usage: {} }])).toBe("—");
  });

  test("shows zero when a span reports zero", () => {
    expect(formatReportedCost([{ usage: { costUsd: 0 } }])).toBe("$0");
  });

  test("sums the costs that were reported", () => {
    expect(
      formatReportedCost([
        { usage: { costUsd: 1.5 } },
        { usage: {} },
        { usage: { costUsd: 2.25 } },
      ]),
    ).toBe("$3.75");
  });
});

describe("formatStepCount", () => {
  test("uses the run total when the page is shorter", () => {
    expect(formatStepCount({ stepCount: 12, spans: [{}, {}] })).toBe("12");
  });

  test("counts the loaded spans when no total was passed", () => {
    expect(formatStepCount({ spans: [{}, {}, {}] })).toBe("3");
  });
});

describe("formatStarted", () => {
  test("returns an unparseable value unchanged", () => {
    expect(formatStarted("not-a-time")).toBe("not-a-time");
  });

  test("formats a timestamp as a local date and time", () => {
    const shown = formatStarted("2026-10-24T15:04:00.000Z");
    expect(shown.includes("T")).toBe(false);
    expect(shown.includes("2026-10-24")).toBe(false);
    expect(/\bat\b/i.test(shown)).toBe(false);
    expect(shown.includes(" · ")).toBe(true);
  });

  test("leaves a clock time unchanged", () => {
    expect(formatStarted("09:14:02")).toBe("09:14:02");
  });
});
