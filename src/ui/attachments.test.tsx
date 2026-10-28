import { Activity, act, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  useAttachments,
  type AttachmentItem,
} from "../hooks/use-attachments.js";
import {
  Attachment,
  AttachmentMore,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
  type AttachmentData,
} from "./attachments.js";

function mount(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(node));
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const NOTES: AttachmentData = { name: "notes.txt", mediaType: "text/plain" };

/** A composer that stops rendering the list once it is empty. */
function Composer({ files }: { readonly files: readonly AttachmentData[] }) {
  const [held, setHeld] = useState(files);
  const message = useRef<HTMLTextAreaElement>(null);
  return (
    <div>
      {held.length === 0 ? null : (
        <Attachments variant="list" returnFocusTo={message}>
          {held.map((data) => (
            <Attachment key={data.name} data={data}>
              <AttachmentRemove
                onClick={() =>
                  setHeld((previous) =>
                    previous.filter((item) => item !== data),
                  )
                }
              />
            </Attachment>
          ))}
        </Attachments>
      )}
      <textarea ref={message} aria-label="Message" />
    </div>
  );
}

function button(container: HTMLElement, name: string): HTMLButtonElement {
  const found = container.querySelector<HTMLButtonElement>(
    `button[aria-label='${name}']`,
  );
  if (found === null) throw new Error(`no ${name} button`);
  return found;
}

describe("Attachments", () => {
  test("removing the last attachment returns focus, list gone or not", () => {
    const { container, unmount } = mount(
      <Composer files={[NOTES, { name: "plan.md", mediaType: "" }]} />,
    );
    const first = button(container, "Remove notes.txt");
    first.focus();
    act(() => first.click());
    expect(document.activeElement).toBe(button(container, "Remove plan.md"));

    act(() => button(container, "Remove plan.md").click());
    expect(container.querySelector("ul")).toBeNull();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Message");
    unmount();
  });

  test("a preview that opens keeps the host's props", () => {
    const opened: string[] = [];
    const keys: string[] = [];
    const seen: { element: HTMLElement | null } = { element: null };
    const { container, unmount } = mount(
      <Attachments>
        <Attachment data={NOTES}>
          <AttachmentPreview
            ref={(node) => {
              seen.element = node;
            }}
            data-testid="preview"
            title="Preview"
            aria-label="Host name"
            onKeyDown={(event) => keys.push(event.key)}
            onOpen={(data) => opened.push(data.name)}
          />
        </Attachment>
      </Attachments>,
    );
    const preview = container.querySelector<HTMLElement>(
      "[data-testid=preview]",
    );
    expect(preview?.tagName).toBe("BUTTON");
    expect(seen.element).toBe(preview);
    expect(preview?.title).toBe("Preview");
    // Its own name wins.
    expect(preview?.getAttribute("aria-label")).toBe("Open notes.txt");
    act(() => {
      preview?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "a", bubbles: true }),
      );
      preview?.click();
    });
    expect(keys).toEqual(["a"]);
    expect(opened).toEqual(["notes.txt"]);
    unmount();
  });

  test("a preview that opens takes its name from label", () => {
    const { container, unmount } = mount(
      <Attachments>
        <Attachment data={NOTES}>
          <AttachmentPreview label="View the notes" onOpen={() => {}} />
        </Attachment>
      </Attachments>,
    );
    expect(button(container, "View the notes").dataset["slot"]).toBe(
      "attachment-preview",
    );
    unmount();
  });

  test("an uncontrolled list folds until More expands it", () => {
    const files: readonly AttachmentData[] = ["a.txt", "b.txt", "c.txt"].map(
      (name) => ({ name, mediaType: "text/plain" }),
    );
    const { container, unmount } = mount(
      <Attachments variant="list">
        {({ expanded }) => {
          const shown = expanded ? files : files.slice(0, 1);
          return (
            <>
              {shown.map((data) => (
                <Attachment key={data.name} data={data}>
                  <AttachmentRemove />
                </Attachment>
              ))}
              {expanded ? null : <AttachmentMore count={files.length - 1} />}
            </>
          );
        }}
      </Attachments>,
    );
    const names = () =>
      [...container.querySelectorAll("[data-slot=attachment-remove]")].map(
        (element) => element.getAttribute("aria-label"),
      );
    expect(names()).toEqual(["Remove a.txt"]);

    const more = button(container, "Show 2 more");
    more.focus();
    act(() => more.click());
    expect(names()).toEqual(["Remove a.txt", "Remove b.txt", "Remove c.txt"]);
    expect(container.querySelector("ul")?.dataset["expanded"]).toBe("true");
    // Focus goes to the first attachment that was folded away.
    expect(document.activeElement).toBe(button(container, "Remove b.txt"));
    unmount();
  });

  test("defaultExpanded starts an uncontrolled list expanded", () => {
    const { container, unmount } = mount(
      <Attachments variant="list" defaultExpanded>
        {({ expanded }) => (expanded ? <li>all</li> : <li>some</li>)}
      </Attachments>,
    );
    expect(container.textContent).toBe("all");
    unmount();
  });
});

describe("a preview held across a hidden Activity", () => {
  let live = new Set<string>();
  let made = 0;
  const realCreate = URL.createObjectURL;
  const realRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    live = new Set();
    made = 0;
    URL.createObjectURL = () => {
      made += 1;
      const url = `blob:test/${made}`;
      live.add(url);
      return url;
    };
    URL.revokeObjectURL = (url: string) => {
      live.delete(url);
    };
  });

  afterEach(() => {
    URL.createObjectURL = realCreate;
    URL.revokeObjectURL = realRevoke;
  });

  function tick(): Promise<void> {
    return act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
  }

  test("is rebuilt from its file once its URL stops loading", async () => {
    let attach: (files: readonly File[]) => void = () => {};
    let setHidden: (hidden: boolean) => void = () => {};

    function Composer() {
      const [held, setHeld] = useState<readonly AttachmentItem[]>([]);
      const { add } = useAttachments({ attachments: held });
      attach = (files) => {
        const { accepted } = add(files);
        setHeld((previous) => [...previous, ...accepted]);
      };
      return (
        <Attachments variant="tiles">
          {held.map((item) => (
            <Attachment key={item.id} data={item}>
              <AttachmentPreview />
            </Attachment>
          ))}
        </Attachments>
      );
    }

    function Route() {
      const [hidden, setRouteHidden] = useState(false);
      setHidden = setRouteHidden;
      return (
        <Activity mode={hidden ? "hidden" : "visible"}>
          <Composer />
        </Activity>
      );
    }

    const { container, unmount } = mount(<Route />);
    act(() => attach([new File(["x"], "shot.png", { type: "image/png" })]));
    const picture = () => container.querySelector("img");
    const first = picture()?.getAttribute("src") ?? "";
    expect(live.has(first)).toBe(true);

    // Hidden for longer than a tick: the hook's previews go.
    act(() => setHidden(true));
    await tick();
    act(() => setHidden(false));
    await tick();
    expect(live.has(first)).toBe(false);

    // The browser fails to load the revoked URL.
    act(() => {
      picture()?.dispatchEvent(new Event("error"));
    });
    const rebuilt = picture()?.getAttribute("src") ?? "";
    expect(rebuilt).not.toBe(first);
    expect(live.has(rebuilt)).toBe(true);

    // The rebuilt URL follows the same rule: gone while hidden, made again
    // on show.
    act(() => setHidden(true));
    expect(live.has(rebuilt)).toBe(false);
    act(() => setHidden(false));
    const again = picture()?.getAttribute("src") ?? "";
    expect(live.has(again)).toBe(true);

    unmount();
    await tick();
    expect([...live]).toEqual([]);
  });

  // Such as one `useAttachments` accepted after its host was hidden.
  test("with no URL, is shown from its file", () => {
    const shot = new File(["x"], "shot.png", { type: "image/png" });
    const notes = new File(["x"], "notes.txt", { type: "text/plain" });
    const { container, unmount } = mount(
      <Attachments variant="tiles">
        <Attachment
          data={{ name: "shot.png", mediaType: "image/png", file: shot }}
        >
          <AttachmentPreview />
        </Attachment>
        <Attachment
          data={{ name: "notes.txt", mediaType: "text/plain", file: notes }}
        >
          <AttachmentPreview />
        </Attachment>
      </Attachments>,
    );
    const picture = () => container.querySelector("img");
    const made = picture()?.getAttribute("src") ?? "";
    expect(live.has(made)).toBe(true);
    // Only the picture needs a URL.
    expect([...live]).toEqual([made]);

    act(() => {
      picture()?.dispatchEvent(new Event("error"));
    });
    expect(picture()).toBeNull();
    expect(container.textContent).toContain("PNG");
    unmount();
    expect([...live]).toEqual([]);
  });

  test("falls back to the type when the rebuilt URL fails too", () => {
    const shot = new File(["x"], "shot.png", { type: "image/png" });
    const { container, unmount } = mount(
      <Attachments variant="tiles">
        <Attachment
          data={{
            name: "shot.png",
            mediaType: "image/png",
            url: "blob:test/gone",
            file: shot,
          }}
        >
          <AttachmentPreview />
        </Attachment>
      </Attachments>,
    );
    const fail = () =>
      act(() => {
        container.querySelector("img")?.dispatchEvent(new Event("error"));
      });
    fail();
    expect(container.querySelector("img")).not.toBeNull();
    fail();
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("PNG");
    unmount();
    expect([...live]).toEqual([]);
  });
});
