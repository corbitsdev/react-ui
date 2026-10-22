import { act, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import {
  Attachment,
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
});
