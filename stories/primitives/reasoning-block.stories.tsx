import { ReasoningBlock } from "../../src/ui/reasoning-block.js";

export default { title: "Primitives / Reasoning block" };

const TEXT =
  "The user wants a weekly summary. I should pull the last 7 days of orders, group by " +
  "status, and call out anything that shipped late before drafting the reply.";

export const Collapsed = () => <ReasoningBlock text={TEXT} durationLabel="Thought for 4s" />;

export const Expanded = () => <ReasoningBlock text={TEXT} durationLabel="Thought for 4s" defaultOpen />;

export const Streaming = () => <ReasoningBlock text={TEXT} streaming />;

export const NoDuration = () => <ReasoningBlock text={TEXT} />;
