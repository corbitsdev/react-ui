import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";

import { CSV_GRID_ROW_CAP } from "../lib/csv-grid.js";
import type { CsvSelection } from "./csv-table.js";
import { CsvTable, csvFilterSpecs } from "./csv-table.js";

function mount(props: ComponentProps<typeof CsvTable>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = (next: ComponentProps<typeof CsvTable>) =>
    act(() => {
      root.render(createElement(CsvTable, next));
    });
  render(props);
  return {
    container,
    render,
    firstColumn: () =>
      [...container.querySelectorAll('tbody [data-cell$=":0"]')].map(
        (cell) => cell.textContent,
      ),
    status: () => container.querySelector('[role="status"]')?.textContent,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const click = (element: Element | null, init: MouseEventInit = {}) =>
  act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true, ...init }));
  });

const header = (container: HTMLElement, name: string) =>
  [...container.querySelectorAll("thead button")].find(
    (button) => button.textContent === name,
  ) ?? null;

describe("CsvTable interactive", () => {
  test("search, sort and select-all cover rows past the render cap", () => {
    const reported: (CsvSelection | null)[] = [];
    const rows = Array.from(
      { length: CSV_GRID_ROW_CAP + 500 },
      (_, index) => `item-${index},${index}`,
    );
    const props = {
      text: ["name,amount", ...rows].join("\n"),
      interactive: true,
      onSelectionChange: (selection: CsvSelection | null) =>
        reported.push(selection),
    };
    const { container, render, firstColumn, status, unmount } = mount(props);
    expect(firstColumn()).toHaveLength(CSV_GRID_ROW_CAP);
    act(() => {
      container.querySelector("table")?.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "a",
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });
    expect(reported.at(-1)?.rows).toBe(CSV_GRID_ROW_CAP + 500);

    click(header(container, "amount"));
    click(header(container, "amount"));
    expect(firstColumn()[0]).toBe(`item-${CSV_GRID_ROW_CAP + 499}`);

    render({ ...props, query: "ITEM-1499" });
    expect(firstColumn()).toEqual(["item-1499"]);
    expect(status()).toContain("1 of 1,500 rows");
    unmount();
  });

  test("numbers sort as numbers, blanks last, and a blank filter matches blanks", () => {
    const text = 'name,amount,kind\na,"(1,234)",x\nb,,y\nc,$-5,x\nd,20,\ne,3,y';
    const { container, render, firstColumn, unmount } = mount({
      text,
      interactive: true,
    });
    click(header(container, "amount"));
    expect(firstColumn()).toEqual(["a", "c", "e", "d", "b"]);

    const kind = csvFilterSpecs(text).find((spec) => spec.label === "kind");
    const blank = kind?.options.at(-1)?.value;
    expect(kind?.options.at(-1)?.label).toBe("(blank)");
    render({ text, interactive: true, filters: { [kind!.id]: blank! } });
    expect(firstColumn()).toEqual(["d"]);
    unmount();
  });

  test("a selected range reports the sorted, filtered cells as TSV", () => {
    const reported: (CsvSelection | null)[] = [];
    const { container, unmount } = mount({
      text: "name,amount,note\nc,3,keep\na,1,keep\nb,2,drop\nd,4,keep",
      interactive: true,
      query: "keep",
      onSelectionChange: (selection) => reported.push(selection),
    });
    click(header(container, "name"));
    click(container.querySelector('[data-cell="0:0"]'));
    click(container.querySelector('[data-cell="1:1"]'), { shiftKey: true });
    expect(reported.at(-1)?.toTsv()).toBe("a\t1\nc\t3");
    unmount();
  });

  test("a failed copy is reported until the selection moves", async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("blocked")) },
    });
    const { container, unmount } = mount({
      text: "name,amount\na,1\nb,2",
      interactive: true,
    });
    const copyStatus = () =>
      container.querySelectorAll('[role="status"]')[1]?.textContent;
    try {
      click(container.querySelector('[data-cell="0:0"]'));
      await act(async () => {
        container.querySelector("table")?.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "c",
            ctrlKey: true,
            bubbles: true,
          }),
        );
      });
      expect(copyStatus()).toContain("Couldn't copy");
      click(container.querySelector('[data-cell="1:0"]'));
      expect(copyStatus()).toBe("");
    } finally {
      unmount();
      if (original === undefined) {
        Reflect.deleteProperty(navigator, "clipboard");
      } else {
        Object.defineProperty(navigator, "clipboard", original);
      }
    }
  });

  test("new text resets sort and selection", () => {
    const selections: (CsvSelection | null)[] = [];
    const props = {
      interactive: true,
      onSelectionChange: (selection: CsvSelection | null) =>
        selections.push(selection),
    };
    const { container, render, firstColumn, unmount } = mount({
      ...props,
      text: "name,amount\nb,2\na,1",
    });
    click(header(container, "name"));
    click(container.querySelector('[data-cell="0:0"]'));

    render({ ...props, text: "name,amount\nz,9\ny,8" });
    expect(firstColumn()).toEqual(["z", "y"]);
    expect(container.querySelector("[aria-sort]")).toBeNull();
    expect(selections.at(-1)).toBeNull();
    unmount();
  });
});
