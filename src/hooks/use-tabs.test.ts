import { act } from "react";
import { describe, expect, mock, test } from "bun:test";

import { renderHook } from "../test/render-hook.js";
import { panelTabIds, useTabs, type UseTabsOptions } from "./use-tabs.js";

type Tab = { readonly value: string; readonly title: string };

const TABS: readonly Tab[] = ["a", "b", "c", "d"].map((value) => ({
  value,
  title: value.toUpperCase(),
}));

function values(tabs: readonly Tab[]): string[] {
  return tabs.map((tab) => tab.value);
}

function setup(options: UseTabsOptions<Tab> = {}) {
  return renderHook(() => useTabs<Tab>({ defaultTabs: TABS, ...options }));
}

describe("useTabs", () => {
  test("selects the first tab unless told otherwise", () => {
    expect(setup().result.current.value).toBe("a");
    expect(setup({ defaultValue: "c" }).result.current.value).toBe("c");
    expect(renderHook(() => useTabs<Tab>()).result.current.value).toBeNull();
  });

  test("closing the selected tab selects its right neighbour", () => {
    const hook = setup({ defaultValue: "b" });
    act(() => hook.result.current.close("b"));
    expect(values(hook.result.current.tabs)).toEqual(["a", "c", "d"]);
    expect(hook.result.current.value).toBe("c");
  });

  test("closing the selected last tab selects its left neighbour", () => {
    const hook = setup({ defaultValue: "d" });
    act(() => hook.result.current.close("d"));
    expect(values(hook.result.current.tabs)).toEqual(["a", "b", "c"]);
    expect(hook.result.current.value).toBe("c");
  });

  test("closing another tab keeps the selection", () => {
    const hook = setup({ defaultValue: "b" });
    act(() => hook.result.current.close("d"));
    expect(hook.result.current.value).toBe("b");
  });

  test("closing every tab leaves nothing selected", () => {
    const hook = setup();
    act(() => {
      for (const tab of TABS) hook.result.current.close(tab.value);
    });
    expect(hook.result.current.tabs).toEqual([]);
    expect(hook.result.current.value).toBeNull();
  });

  test("closing a tab that is not open changes nothing", () => {
    const onTabsChange = mock();
    const hook = setup({ onTabsChange });
    act(() => hook.result.current.close("z"));
    expect(values(hook.result.current.tabs)).toEqual(["a", "b", "c", "d"]);
    expect(onTabsChange).not.toHaveBeenCalled();
  });

  test("moving clamps at both ends", () => {
    const hook = setup();
    act(() => hook.result.current.move("b", 99));
    expect(values(hook.result.current.tabs)).toEqual(["a", "c", "d", "b"]);
    act(() => hook.result.current.move("d", -5));
    expect(values(hook.result.current.tabs)).toEqual(["d", "a", "c", "b"]);
    act(() => hook.result.current.move("c", 1));
    expect(values(hook.result.current.tabs)).toEqual(["d", "c", "a", "b"]);
  });

  test("moving to where a tab already is reports nothing", () => {
    const onTabsChange = mock();
    const hook = setup({ onTabsChange });
    act(() => hook.result.current.move("a", -1));
    act(() => hook.result.current.move("d", 10));
    act(() => hook.result.current.move("z", 0));
    expect(onTabsChange).not.toHaveBeenCalled();
  });

  test("changes in one event build on each other", () => {
    const hook = setup({ defaultValue: "a" });
    act(() => {
      hook.result.current.close("a");
      hook.result.current.close("b");
      hook.result.current.move("d", 0);
    });
    expect(values(hook.result.current.tabs)).toEqual(["d", "c"]);
    expect(hook.result.current.value).toBe("c");
  });

  test("opening adds at the end, or replaces an open tab in place", () => {
    const onTabsChange = mock();
    const hook = setup({ onTabsChange });
    act(() => hook.result.current.open({ value: "e", title: "E" }));
    expect(values(hook.result.current.tabs)).toEqual(["a", "b", "c", "d", "e"]);
    expect(hook.result.current.value).toBe("e");

    act(() => hook.result.current.open({ value: "b", title: "B again" }));
    expect(values(hook.result.current.tabs)).toEqual(["a", "b", "c", "d", "e"]);
    expect(hook.result.current.tabs[1]?.title).toBe("B again");
    expect(hook.result.current.value).toBe("b");
    expect(onTabsChange).toHaveBeenCalledTimes(2);
  });

  test("updating changes a tab's data in place and keeps the selection", () => {
    const onTabsChange = mock();
    const onValueChange = mock();
    const hook = setup({ defaultValue: "a", onTabsChange, onValueChange });
    act(() => hook.result.current.update("c", { title: "C, titled late" }));
    expect(values(hook.result.current.tabs)).toEqual(["a", "b", "c", "d"]);
    expect(hook.result.current.tabs[2]?.title).toBe("C, titled late");
    expect(hook.result.current.value).toBe("a");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onTabsChange).toHaveBeenCalledTimes(1);
  });

  test("updating a closed tab, or with nothing new, reports nothing", () => {
    const onTabsChange = mock();
    const hook = setup({ onTabsChange });
    act(() => hook.result.current.close("c"));
    onTabsChange.mockClear();
    act(() => hook.result.current.update("c", { title: "C" }));
    act(() => hook.result.current.update("b", { title: "B" }));
    expect(values(hook.result.current.tabs)).toEqual(["a", "b", "d"]);
    expect(onTabsChange).not.toHaveBeenCalled();
  });

  test("selects only open tabs", () => {
    const hook = setup();
    act(() => hook.result.current.select("c"));
    expect(hook.result.current.value).toBe("c");
    act(() => hook.result.current.select("z"));
    expect(hook.result.current.value).toBe("c");
  });

  test("a controlled selection is reported, not kept", () => {
    const onValueChange = mock();
    const hook = setup({ value: "b", onValueChange });
    act(() => hook.result.current.close("b"));
    expect(onValueChange).toHaveBeenLastCalledWith("c");
    expect(hook.result.current.value).toBe("b");
  });

  test("closing a tab that is not selected reports no selection", () => {
    const onValueChange = mock();
    const hook = setup({ defaultValue: "a", onValueChange });
    act(() => hook.result.current.close("c"));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(hook.result.current.value).toBe("a");
  });

  test("closes in one event chain with a controlled selection", () => {
    const onValueChange = mock();
    const hook = setup({ value: "a", onValueChange });
    act(() => {
      for (const tab of TABS) hook.result.current.close(tab.value);
    });
    expect(hook.result.current.tabs).toEqual([]);
    expect(onValueChange.mock.calls).toEqual([["b"], ["c"], ["d"], [null]]);
  });

  test("a select a controlled parent turns down does not steer a later close", () => {
    const onValueChange = mock();
    const hook = setup({ value: "a", onValueChange });
    act(() => hook.result.current.select("c"));
    expect(onValueChange).toHaveBeenLastCalledWith("c");
    onValueChange.mockClear();
    act(() => hook.result.current.close("c"));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("a select and a close in one event chain when uncontrolled", () => {
    const hook = setup({ defaultValue: "a" });
    act(() => {
      hook.result.current.select("c");
      hook.result.current.close("c");
    });
    expect(hook.result.current.value).toBe("d");
  });

  test("tabsProps and paneProps name the same ids", () => {
    const hook = setup();
    const { tabsProps, paneProps } = hook.result.current;
    const ids = panelTabIds(tabsProps.idPrefix, "a");
    expect(paneProps("a")).toEqual({
      id: ids.pane,
      role: "tabpanel",
      "aria-labelledby": ids.tab,
    });
  });
});

describe("panelTabIds", () => {
  test("makes one valid, distinct id per value", () => {
    const spaced = panelTabIds("p", "my file.ts");
    expect(spaced.tab).not.toMatch(/\s/);
    expect(spaced.pane).not.toMatch(/\s/);
    const seen = new Set(
      ["a b", "a.b", "a_b", "a-b", "a:b", "a.20.b"].map(
        (value) => panelTabIds("p", value).tab,
      ),
    );
    expect(seen.size).toBe(6);
  });
});
