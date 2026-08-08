import { PagePanel } from "../../src/ui/page-panel.js";
import { Section } from "../../src/ui/section.js";

export default { title: "Primitives / Page panel" };

const Body = () => (
  <Section title="A titled block" description="Content the panel frames.">
    <p className="text-sm text-muted-foreground">
      The panel owns the page&apos;s vertical scroll and its framing border.
    </p>
  </Section>
);

export const Scrolling = () => (
  <div className="h-72">
    <PagePanel className="gap-6 p-6">
      {[0, 1, 2, 3, 4].map((index) => (
        <Body key={index} />
      ))}
    </PagePanel>
  </div>
);

export const FitContent = () => (
  <div className="h-72">
    <PagePanel fitContent className="gap-6 p-6">
      <Body />
    </PagePanel>
  </div>
);

export const OnCardSurface = () => (
  <div className="h-72 rounded-lg bg-card p-4">
    <PagePanel surface="card" flat className="p-6">
      <Body />
    </PagePanel>
  </div>
);
