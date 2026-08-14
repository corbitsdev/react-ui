import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { ProfileCard } from "../../src/ui/profile-card.js";

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

describe("ProfileCard href safety", () => {
  test("a data: URL on a shared channel never reaches a live href", () => {
    const mounted = render(
      <ProfileCard
        name="Test"
        initials="T"
        sharedChannels={[{ id: "c1", name: "general", href: "data:text/html,<script>alert(1)</script>" }]}
      />,
    );
    expect(mounted.container.querySelector("a")).toBeNull();
    expect(mounted.container.textContent).toContain("#general");
    mounted.unmount();
  });

  test("a file: URL on a pinned skill never reaches a live href", () => {
    const mounted = render(
      <ProfileCard
        name="Test"
        initials="T"
        pinnedSkills={[{ id: "s1", name: "sql", href: "file:///etc/passwd" }]}
      />,
    );
    expect(mounted.container.querySelector("a")).toBeNull();
    expect(mounted.container.textContent).toContain("sql");
    mounted.unmount();
  });

  test("a javascript: URL on a shared channel never reaches a live href", () => {
    const mounted = render(
      <ProfileCard
        name="Test"
        initials="T"
        sharedChannels={[{ id: "c1", name: "general", href: "javascript:alert(1)" }]}
      />,
    );
    expect(mounted.container.querySelector("a")).toBeNull();
    mounted.unmount();
  });

  test("an https: URL on a shared channel passes through to a live href", () => {
    const mounted = render(
      <ProfileCard
        name="Test"
        initials="T"
        sharedChannels={[{ id: "c1", name: "general", href: "https://example.com/c/general" }]}
      />,
    );
    const anchor = mounted.container.querySelector("a");
    expect(anchor?.getAttribute("href")).toBe("https://example.com/c/general");
    expect(anchor?.textContent).toBe("#general");
    mounted.unmount();
  });

  test("an http: URL on a pinned skill passes through to a live href", () => {
    const mounted = render(
      <ProfileCard
        name="Test"
        initials="T"
        pinnedSkills={[{ id: "s1", name: "sql", href: "http://example.com/skills/sql" }]}
      />,
    );
    const anchor = mounted.container.querySelector("a");
    expect(anchor?.getAttribute("href")).toBe("http://example.com/skills/sql");
    mounted.unmount();
  });

  test("a channel with no href renders as plain text, not a link", () => {
    const mounted = render(
      <ProfileCard name="Test" initials="T" sharedChannels={[{ id: "c1", name: "general" }]} />,
    );
    expect(mounted.container.querySelector("a")).toBeNull();
    expect(mounted.container.textContent).toContain("#general");
    mounted.unmount();
  });

  test("a skill with no href renders as a plain badge, not a link", () => {
    const mounted = render(
      <ProfileCard name="Test" initials="T" pinnedSkills={[{ id: "s1", name: "sql" }]} />,
    );
    expect(mounted.container.querySelector("a")).toBeNull();
    expect(mounted.container.textContent).toContain("sql");
    mounted.unmount();
  });
});

describe("ProfileCard actions", () => {
  test("clicking an action button fires its onClick", () => {
    let clicked = 0;
    const mounted = render(
      <ProfileCard
        name="Test"
        initials="T"
        actions={[{ id: "a1", label: "Message", onClick: () => (clicked += 1) }]}
      />,
    );
    const button = mounted.container.querySelector("button");
    expect(button?.textContent).toBe("Message");
    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(clicked).toBe(1);
    mounted.unmount();
  });

  test("no actions renders no action buttons", () => {
    const mounted = render(<ProfileCard name="Test" initials="T" />);
    expect(mounted.container.querySelector("button")).toBeNull();
    mounted.unmount();
  });
});

describe("ProfileCard conditional sections", () => {
  test("statusLabel renders a badge; omitting it renders none", () => {
    const withStatus = render(<ProfileCard name="Test" initials="T" statusLabel="Online" />);
    expect(withStatus.container.textContent).toContain("Online");
    withStatus.unmount();

    const withoutStatus = render(<ProfileCard name="Test" initials="T" />);
    expect(withoutStatus.container.textContent).not.toContain("Online");
    withoutStatus.unmount();
  });

  test("subtitle renders when present and is absent otherwise", () => {
    const withSubtitle = render(<ProfileCard name="Test" initials="T" subtitle="Engineering" />);
    expect(withSubtitle.container.textContent).toContain("Engineering");
    withSubtitle.unmount();

    const withoutSubtitle = render(<ProfileCard name="Test" initials="T" />);
    expect(withoutSubtitle.container.textContent).not.toContain("Engineering");
    withoutSubtitle.unmount();
  });

  test("footer renders arbitrary content when present and is absent otherwise", () => {
    const withFooter = render(
      <ProfileCard name="Test" initials="T" footer={<span>Joined 2024</span>} />,
    );
    expect(withFooter.container.querySelector("footer")?.textContent).toBe("Joined 2024");
    withFooter.unmount();

    const withoutFooter = render(<ProfileCard name="Test" initials="T" />);
    expect(withoutFooter.container.querySelector("footer")).toBeNull();
    withoutFooter.unmount();
  });

  test("empty sharedChannels/pinnedSkills render neither section", () => {
    const mounted = render(<ProfileCard name="Test" initials="T" sharedChannels={[]} pinnedSkills={[]} />);
    expect(mounted.container.textContent).not.toContain("Shared channels");
    expect(mounted.container.textContent).not.toContain("Pinned skills");
    mounted.unmount();
  });
});
