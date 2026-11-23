// A coordinator's agents for the Activity stories: three designers making
// three looks for a personal calorie tracker, and a writer before them. The
// live hook plays a run in real time: every few seconds an agent starts its
// next step, and what it writes grows a little.

import { useEffect, useRef, useState } from "react";

import type { PartTool } from "../../../src/lib/conversation.js";
import type { ActivityAgent } from "../../../src/ui/activity-agents.js";

const S = 1000;
const M = 60 * S;

type Script = {
  readonly steps: readonly (readonly [string, string])[];
  readonly writing: string;
};

const SCRIPTS: Record<string, Script> = {
  friendly: {
    steps: [
      ["Reading the requirements", "Read the requirements"],
      ["Sketching the main page", "Sketched the main page"],
      ["Shaping the styles", "Shaped the styles"],
      ["Drafting the add food screen", "Drafted the add food screen"],
      ["Running a quick check", "Ran a quick check"],
      ["Polishing the main page", "Polished the main page"],
    ],
    writing: `:root {
  --paper: #fbf7f0;
  --ink: #2b2627;
  --tomato: #e0603a;
  --radius: 18px;
}

.today {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.ring {
  inline-size: 168px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: conic-gradient(var(--tomato) calc(var(--eaten) * 1turn), #f1e7da 0);
}

.meal-card h3 { font: 600 15px/1.3 "Nunito", sans-serif; }
`,
  },
  sleek: {
    steps: [
      ["Reading the design notes", "Read the design notes"],
      ["Building the dashboard", "Built the dashboard"],
      ["Tweaking the styles", "Tweaked the styles"],
      ["Drafting earlier days", "Drafted earlier days"],
      ["Running a quick check", "Ran a quick check"],
    ],
    writing: `<main class="dash">
  <header>
    <p class="date">Monday 23 November</p>
    <button class="goal">Goal 2,100 kcal</button>
  </header>
  <section class="numbers">
    <div><span>Eaten</span><strong>1,240</strong></div>
    <div><span>Left</span><strong>860</strong></div>
  </section>
  <div class="bar"><i style="--p: 59%"></i></div>
  <ol class="meals">
    <li>Breakfast <b>420</b></li>
    <li>Lunch <b>610</b></li>
`,
  },
  editorial: {
    steps: [
      ["Studying the requirements", "Studied the requirements"],
      ["Writing the design notes", "Wrote the design notes"],
      ["Sketching the daily page", "Sketched the daily page"],
      ["Reworking the type", "Reworked the type"],
    ],
    writing: `# Editorial

A daily page, like a food journal. One serif for the
headline, a quiet grotesk for numbers.

## Today

- The date is the headline, set large.
- The goal sits under it as a sentence: *2,100 kcal,
  860 left.*
- Meals read as short entries with a time in the
  margin.

## Earlier days

A list of pages, newest first.
`,
  },
};

const DESIGN_BRIEF =
  "Design a personal calorie tracking web app for one person in a browser. Use the filed product requirements. Cover these screens, on a phone width and a computer width: Today (date, daily calorie goal with a way to change it, calories eaten, remaining or over, a simple progress mark, protein/carbs/fat totals when known), Add food, Earlier days and Settings. Keep it calm; no diet advice.";

function step(name: string, index: number, running: boolean): PartTool {
  return {
    kind: "tool-trace",
    toolCallId: `${name}-${index}`,
    name,
    status: running ? "running" : "output-available",
    ...(running ? {} : { output: "ok" }),
  };
}

function stepsOf(key: string, count: number): readonly PartTool[] {
  const script = SCRIPTS[key];
  if (script === undefined) throw new Error(key);
  return Array.from({ length: count }, (_, i) => {
    const [working, done] = script.steps[i % script.steps.length] ?? [
      "Working",
      "Worked",
    ];
    // The newest step is the one under way.
    return step(i === count - 1 ? working : done, i, i === count - 1);
  });
}

function designer(
  key: string,
  name: string,
  count: number,
  startedAt: number,
): ActivityAgent {
  return {
    id: key,
    role: "Designer",
    name,
    task: `Making the ${name} mockup`,
    state: "working",
    startedAt,
    steps: stepsOf(key, count),
    preview: {
      kind: "writing",
      text: SCRIPTS[key]?.writing.slice(0, 220) ?? "",
    },
    instruction: DESIGN_BRIEF,
    watchLabel: "Watch the draft",
    onWatch: () => undefined,
    onStop: () => undefined,
  };
}

/** Three designers, about eleven minutes in. */
export function designers(now = Date.now()): readonly ActivityAgent[] {
  const startedAt = now - 11 * M - 19 * S;
  return [
    designer("friendly", "Friendly", 17, startedAt),
    designer("sleek", "Sleek modern", 33, startedAt),
    designer("editorial", "Editorial", 20, startedAt),
  ];
}

/** The same team with one designer stopped on a question for you. */
export function designersAsking(now = Date.now()): readonly ActivityAgent[] {
  return designers(now).map((agent) =>
    agent.id === "editorial"
      ? {
          ...agent,
          state: "waiting",
          steps: agent.steps.map((one) =>
            one.kind === "tool-trace"
              ? { ...one, status: "output-available", output: "ok" }
              : one,
          ),
          question: {
            text: "Set the calorie numbers in the serif too, or keep them in the sans?",
            options: ["Serif", "Keep the sans"],
          },
        }
      : agent,
  );
}

/** The team finished: two designs filed, one stopped. */
export function designersDone(now = Date.now()): readonly ActivityAgent[] {
  const startedAt = now - 19 * M;
  return designers(now).map((agent): ActivityAgent => {
    const stopped = agent.id === "sleek";
    const {
      preview: _preview,
      onStop: _onStop,
      onWatch: _onWatch,
      ...rest
    } = agent;
    return {
      ...rest,
      task: `Made the ${agent.name ?? ""} mockup`,
      state: stopped ? "stopped" : "done",
      startedAt,
      endedAt: startedAt + (stopped ? 13 * M : 16 * M + 30 * S),
      steps: agent.steps.map((one) =>
        one.kind === "tool-trace"
          ? { ...one, status: "output-available", output: "ok" }
          : one,
      ),
      ...(stopped
        ? {}
        : {
            result: { title: `${agent.name ?? ""} design v1` },
            onOpen: () => undefined,
          }),
    };
  });
}

/** One writer who filed the requirements. */
export function writer(now = Date.now()): ActivityAgent {
  return {
    id: "writer",
    role: "Writer",
    task: "Wrote the requirements",
    state: "done",
    startedAt: now - 3 * M,
    endedAt: now - 10 * S,
    steps: [
      step("Read the project guide", 0, false),
      step("Drafted the requirements", 1, false),
      step("Filed the requirements", 2, false),
    ],
    instruction:
      'Write product requirements for a personal calorie tracking web app the person opens in a browser. They said: "Create a calorie tracking app for me."',
    report:
      "The requirements describe a simple calorie tracker you open in a browser: you set your own daily goal, log foods by meal, see today and earlier days, reuse foods you have logged before, and fix or delete an entry.",
    result: { title: "Personal calorie tracker v1" },
    onOpen: () => undefined,
  };
}

/**
 * Plays working agents in real time: each moves to its next step every four
 * to eight seconds, on its own rhythm, and what it writes grows.
 */
export function useLiveAgents(
  agents: readonly ActivityAgent[],
): readonly ActivityAgent[] {
  const [tick, setTick] = useState(0);
  const start = useRef(agents);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(timer);
  }, []);
  return start.current.map((agent, index) => {
    if (agent.state !== "working") return agent;
    const script = SCRIPTS[agent.id];
    if (script === undefined) return agent;
    const every = 16 + ((index * 7) % 17);
    const count = agent.steps.length + Math.floor(tick / every);
    const chars = 220 + ((tick * (2 + index)) % (script.writing.length - 220));
    return {
      ...agent,
      steps: stepsOf(agent.id, count),
      preview:
        tick % (every * 3) < 4
          ? {
              kind: "thinking",
              text: "The ring should read before the numbers do.",
            }
          : { kind: "writing", text: script.writing.slice(0, chars) },
    };
  });
}
