import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, mock, test } from "bun:test";

import {
  CanvasHost,
  CHAT_CONTENT_VISIBILITY_CLASS,
  GRID_CLASS,
  type CanvasHostContent,
} from "../../src/blocks/canvas-host/canvas-host.js";

type Mounted = {
  container: HTMLElement;
  unmount: () => void;
};

function render(node: React.ReactElement): Mounted {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const CONTENT: CanvasHostContent<{ body: string }> = {
  kind: "note",
  title: "Release notes",
  data: { body: "v1.2.0 shipped" },
};

function noop() {}

describe("CanvasHost content-driven state", () => {
  test("content === null renders the empty state, not the render-prop", () => {
    const renderCanvas = mock(() => <div>should not render</div>);
    const mounted = render(
      <CanvasHost
        messages={[]}
        content={null}
        renderCanvas={renderCanvas}
        focus={false}
        onFocusChange={noop}
        onClose={noop}
      />,
    );
    expect(renderCanvas).not.toHaveBeenCalled();
    expect(mounted.container.querySelector('[data-slot="empty-state"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain("Nothing open");
    mounted.unmount();
  });

  test("content set calls the render-prop instead of the empty state", () => {
    const mounted = render(
      <CanvasHost
        messages={[]}
        content={CONTENT}
        renderCanvas={(content) => <div data-testid="canvas-body">{content.title}</div>}
        focus={false}
        onFocusChange={noop}
        onClose={noop}
      />,
    );
    expect(mounted.container.querySelector('[data-slot="empty-state"]')).toBeNull();
    expect(mounted.container.querySelector('[data-testid="canvas-body"]')?.textContent).toBe("Release notes");
    mounted.unmount();
  });

  test("re-rendering with a new focus value changes the layout — the host, not the component, owns focus", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    let root!: Root;
    act(() => {
      root = createRoot(container);
      root.render(
        <CanvasHost
          messages={[]}
          content={CONTENT}
          renderCanvas={(content) => <div>{content.title}</div>}
          focus={false}
          onFocusChange={noop}
          onClose={noop}
        />,
      );
    });
    expect(container.querySelector('[data-slot="canvas-host"]')?.getAttribute("data-layout")).toBe("split");

    act(() => {
      root.render(
        <CanvasHost
          messages={[]}
          content={CONTENT}
          renderCanvas={(content) => <div>{content.title}</div>}
          focus={true}
          onFocusChange={noop}
          onClose={noop}
        />,
      );
    });
    expect(container.querySelector('[data-slot="canvas-host"]')?.getAttribute("data-layout")).toBe("focus");

    act(() => root.unmount());
    container.remove();
  });
});

describe("CanvasHost focus prop is fully controlled", () => {
  function renderWithFocus(focus: boolean) {
    return render(
      <CanvasHost
        messages={[]}
        content={CONTENT}
        renderCanvas={(content) => <div>{content.title}</div>}
        focus={focus}
        onFocusChange={noop}
        onClose={noop}
      />,
    );
  }

  test("focus=false renders split layout", () => {
    const mounted = renderWithFocus(false);
    expect(mounted.container.querySelector('[data-slot="canvas-host"]')?.getAttribute("data-layout")).toBe("split");
    mounted.unmount();
  });

  test("focus=true renders focus layout — driven purely by the prop, not internal state", () => {
    const mounted = renderWithFocus(true);
    expect(mounted.container.querySelector('[data-slot="canvas-host"]')?.getAttribute("data-layout")).toBe("focus");
    mounted.unmount();
  });
});

describe("CanvasHost header interactions", () => {
  test("clicking close calls onClose exactly once and nothing else", () => {
    const onClose = mock(() => {});
    const onFocusChange = mock(() => {});
    const mounted = render(
      <CanvasHost
        messages={[]}
        content={CONTENT}
        renderCanvas={(content) => <div>{content.title}</div>}
        focus={false}
        onFocusChange={onFocusChange}
        onClose={onClose}
      />,
    );
    const closeButton = mounted.container.querySelector('button[aria-label="Close canvas"]') as HTMLButtonElement;
    act(() => closeButton.click());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onFocusChange).not.toHaveBeenCalled();
    mounted.unmount();
  });

  test("clicking the focus toggle calls onFocusChange with the next value", () => {
    const onFocusChange = mock(() => {});
    const mounted = render(
      <CanvasHost
        messages={[]}
        content={CONTENT}
        renderCanvas={(content) => <div>{content.title}</div>}
        focus={false}
        onFocusChange={onFocusChange}
        onClose={noop}
      />,
    );
    const focusButton = mounted.container.querySelector('button[aria-label="Focus canvas"]') as HTMLButtonElement;
    act(() => focusButton.click());
    expect(onFocusChange).toHaveBeenCalledTimes(1);
    expect(onFocusChange).toHaveBeenCalledWith(true);
    mounted.unmount();
  });

  test("focus and close are real <button type=button> elements, reachable via Tab and Enter/Space natively", () => {
    const mounted = render(
      <CanvasHost
        messages={[]}
        content={CONTENT}
        renderCanvas={(content) => <div>{content.title}</div>}
        focus={false}
        onFocusChange={noop}
        onClose={noop}
      />,
    );
    const focusButton = mounted.container.querySelector('button[aria-label="Focus canvas"]');
    const closeButton = mounted.container.querySelector('button[aria-label="Close canvas"]');
    expect(focusButton?.tagName).toBe("BUTTON");
    expect(focusButton?.getAttribute("type")).toBe("button");
    expect(closeButton?.tagName).toBe("BUTTON");
    expect(closeButton?.getAttribute("type")).toBe("button");
    expect(focusButton?.hasAttribute("disabled")).toBe(false);
    expect(closeButton?.hasAttribute("disabled")).toBe(false);
    mounted.unmount();
  });
});

describe("CanvasHost Escape key", () => {
  function dispatchEscape() {
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
  }

  test("Escape while focused exits focus first, without closing", () => {
    const onFocusChange = mock(() => {});
    const onClose = mock(() => {});
    const mounted = render(
      <CanvasHost
        messages={[]}
        content={CONTENT}
        renderCanvas={(content) => <div>{content.title}</div>}
        focus={true}
        onFocusChange={onFocusChange}
        onClose={onClose}
      />,
    );
    dispatchEscape();
    expect(onFocusChange).toHaveBeenCalledTimes(1);
    expect(onFocusChange).toHaveBeenCalledWith(false);
    expect(onClose).not.toHaveBeenCalled();
    mounted.unmount();
  });

  test("Escape while open but not focused closes the canvas", () => {
    const onFocusChange = mock(() => {});
    const onClose = mock(() => {});
    const mounted = render(
      <CanvasHost
        messages={[]}
        content={CONTENT}
        renderCanvas={(content) => <div>{content.title}</div>}
        focus={false}
        onFocusChange={onFocusChange}
        onClose={onClose}
      />,
    );
    dispatchEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onFocusChange).not.toHaveBeenCalled();
    mounted.unmount();
  });

  test("Escape from a nested dialog inside renderCanvas is consumed by the nested UI, not the host", () => {
    const onFocusChange = mock(() => {});
    const onClose = mock(() => {});
    const mounted = render(
      <CanvasHost
        messages={[]}
        content={CONTENT}
        renderCanvas={() => (
          <div role="dialog" data-testid="nested-dialog">
            nested overlay content
          </div>
        )}
        focus={false}
        onFocusChange={onFocusChange}
        onClose={onClose}
      />,
    );
    const nestedDialog = mounted.container.querySelector('[data-testid="nested-dialog"]') as HTMLElement;
    act(() => {
      nestedDialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(onFocusChange).not.toHaveBeenCalled();
    mounted.unmount();
  });

  test("Escape is a no-op when nothing is open", () => {
    const onFocusChange = mock(() => {});
    const onClose = mock(() => {});
    const mounted = render(
      <CanvasHost
        messages={[]}
        content={null}
        renderCanvas={() => <div />}
        focus={false}
        onFocusChange={onFocusChange}
        onClose={onClose}
      />,
    );
    dispatchEscape();
    expect(onClose).not.toHaveBeenCalled();
    expect(onFocusChange).not.toHaveBeenCalled();
    mounted.unmount();
  });
});

describe("CanvasHost chat transcript", () => {
  test("renders one parts-renderer block per message, in order", () => {
    const mounted = render(
      <CanvasHost
        messages={[
          { id: "m1", parts: [{ kind: "text", text: "first" }] },
          { id: "m2", parts: [{ kind: "text", text: "second" }] },
        ]}
        content={null}
        renderCanvas={() => <div />}
        focus={false}
        onFocusChange={noop}
        onClose={noop}
      />,
    );
    const messageNodes = mounted.container.querySelectorAll('[data-slot="canvas-host-message"]');
    expect(messageNodes.length).toBe(2);
    expect(messageNodes[0]?.textContent).toBe("first");
    expect(messageNodes[1]?.textContent).toBe("second");
    mounted.unmount();
  });

  test("emptyChat renders when messages is empty", () => {
    const mounted = render(
      <CanvasHost
        messages={[]}
        content={null}
        renderCanvas={() => <div />}
        focus={false}
        onFocusChange={noop}
        onClose={noop}
        emptyChat={<p data-testid="empty-chat">Nothing here yet</p>}
      />,
    );
    expect(mounted.container.querySelector('[data-testid="empty-chat"]')).not.toBeNull();
    mounted.unmount();
  });
});

describe("CanvasHost composer footer", () => {
  test("composer omitted renders no footer", () => {
    const mounted = render(
      <CanvasHost messages={[]} content={null} renderCanvas={() => <div />} focus={false} onFocusChange={noop} onClose={noop} />,
    );
    expect(mounted.container.querySelector('[data-slot="chat-panel-footer"]')).toBeNull();
    mounted.unmount();
  });

  test("composer={null} renders no footer, identically to omitting it", () => {
    const mounted = render(
      <CanvasHost
        messages={[]}
        content={null}
        renderCanvas={() => <div />}
        focus={false}
        onFocusChange={noop}
        onClose={noop}
        composer={null}
      />,
    );
    expect(mounted.container.querySelector('[data-slot="chat-panel-footer"]')).toBeNull();
    mounted.unmount();
  });

  test("composer with content renders the footer", () => {
    const mounted = render(
      <CanvasHost
        messages={[]}
        content={null}
        renderCanvas={() => <div />}
        focus={false}
        onFocusChange={noop}
        onClose={noop}
        composer={<button type="button">send</button>}
      />,
    );
    expect(mounted.container.querySelector('[data-slot="chat-panel-footer"]')).not.toBeNull();
    mounted.unmount();
  });
});

describe("CanvasHost layout class tables", () => {
  test("GRID_CLASS: split shows chat below `lg`, both columns at `lg`+", () => {
    expect(GRID_CLASS.chat).toBe("grid-cols-[minmax(0,1fr)_0px]");
    expect(GRID_CLASS.split).toBe("grid-cols-[minmax(0,1fr)_0px] lg:grid-cols-[minmax(0,1fr)_min(28rem,40%)]");
    expect(GRID_CLASS.focus).toBe("grid-cols-[0px_minmax(0,1fr)] lg:grid-cols-[4rem_minmax(0,1fr)]");
  });

  test("CHAT_CONTENT_VISIBILITY_CLASS: chat stays visible in chat/split, hidden only in focus", () => {
    expect(CHAT_CONTENT_VISIBILITY_CLASS.chat).toBe("");
    expect(CHAT_CONTENT_VISIBILITY_CLASS.split).toBe("");
    expect(CHAT_CONTENT_VISIBILITY_CLASS.focus).toBe("invisible pointer-events-none");
  });
});
