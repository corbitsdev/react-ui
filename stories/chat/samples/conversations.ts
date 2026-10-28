/**
 * Sample conversations for the chat stories, built only from the contract
 * types in `src/lib/conversation.ts`. Everything here is deterministic: ids
 * and timestamps are fixed, and images are inline SVG, so a story renders the
 * same on every run and never touches the network.
 */

import type {
  ConversationImage,
  ConversationMessage,
  ConversationParticipant,
  ConversationPart,
  PartTool,
} from "../../../src/lib/conversation.js";

/**
 * Every sample timestamp sits before this instant. Stories that show
 * relative times or deadlines pass it as their `now` so the output does not
 * drift with the real clock.
 */
export const SAMPLE_NOW = "2026-03-04T12:00:00.000Z";

const NOW_MS = Date.parse(SAMPLE_NOW);

function minutesBefore(minutes: number): string {
  return new Date(NOW_MS - minutes * 60_000).toISOString();
}

/** The viewer: the person whose own sends are `sending` or `failed`. */
export const you: ConversationParticipant = {
  id: "person-you",
  kind: "person",
  name: "Alex Rivera",
};

export const teammate: ConversationParticipant = {
  id: "person-teammate",
  kind: "person",
  name: "Sam Chen",
};

export const assistant: ConversationParticipant = {
  id: "agent-assistant",
  kind: "agent",
  name: "Ada",
  role: "Assistant",
};

export const reviewer: ConversationParticipant = {
  id: "agent-reviewer",
  kind: "agent",
  name: "Iris",
  role: "Review",
};

export type ConversationSample = {
  readonly title: string;
  readonly messages: readonly ConversationMessage[];
  /** Replies to one message, shown apart from the main conversation. */
  readonly thread?: {
    readonly parentId: string;
    readonly replies: readonly ConversationMessage[];
  };
};

type MessageExtras = Pick<
  ConversationMessage,
  "status" | "error" | "replies" | "reactions"
>;

function message(
  id: string,
  author: ConversationParticipant,
  at: string,
  parts: readonly ConversationPart[],
  extras: Partial<MessageExtras> = {},
): ConversationMessage {
  return { id, author, at, status: "sent", parts, ...extras };
}

function text(value: string): ConversationPart {
  return { kind: "text", text: value };
}

function call(
  id: string,
  name: string,
  input: unknown,
  output: unknown,
): PartTool {
  return {
    kind: "tool-trace",
    toolCallId: id,
    name,
    status: "output-available",
    input,
    output,
  };
}

export const shortChat: ConversationSample = {
  title: "Short chat",
  messages: [
    message("short-1", you, minutesBefore(42), [
      text(
        "What changed in the workflow this week? Attaching the plan so you know what matters.",
      ),
      { kind: "file", name: "quarter-plan.pdf", mediaType: "application/pdf" },
    ]),
    message("short-2", assistant, minutesBefore(41), [
      {
        kind: "reasoning",
        text: "List the runs since Monday, compare them with the plan, and call out anything that touches deploys.",
        durationMs: 6_200,
      },
      call(
        "short-call-1",
        "runs__list",
        { since: "monday" },
        "14 runs since Monday",
      ),
      call("short-call-2", "runs__read_log", { runs: 4 }, "Read 4 run logs"),
      text(
        "Fourteen runs finished this week. Two touch the deploy step and carry the risk:\n\n- **Retry cap** now allows 3 restarts in 10 minutes.\n- **Health check** waits longer before marking a run stopped.\n\nEverything else matches the plan.",
      ),
      {
        kind: "sources",
        sources: [
          {
            title: "Retry cap change",
            url: "https://example.com/changes/retry-cap",
          },
          {
            title: "Health check timing",
            url: "https://example.com/changes/health-check",
          },
        ],
      },
    ]),
    message("short-3", you, minutesBefore(7), [
      text("Thanks. Keep an eye on the retry cap next week."),
    ]),
    message(
      "short-4",
      assistant,
      minutesBefore(6),
      [text("Will do. I'll flag it if a run restarts more than twice.")],
      { reactions: [{ emoji: "👍", count: 1, mine: true }] },
    ),
  ],
};

const LONG_QUESTIONS = [
  "What's the status of the export step?",
  "Can you summarise the open items?",
  "Which step took the longest?",
  "Did anything fail overnight?",
  "Draft a note for the team about it.",
];

const LONG_ANSWERS = [
  "Done. I've updated the summary and pinned it to the workflow.",
  "Here's the breakdown:\n\n- **3** deploys\n- **1** rollback\n- **0** open incidents",
  "The fetch step took most of the time, about forty seconds, because it paged through every result before filtering.",
  "Nothing failed. One call was retried once after a slow response.",
  "That change touches access rules, so I'd hold it until someone reviews it.",
];

function generateLongChat(count: number): readonly ConversationMessage[] {
  return Array.from({ length: count }, (_, index) => {
    // Seven minutes apart, so a few hundred messages span more than a day.
    const at = minutesBefore((count - index) * 7);
    const turn = Math.floor(index / 2);
    if (index % 2 === 0) {
      return message(`long-${index}`, you, at, [
        text(LONG_QUESTIONS[turn % LONG_QUESTIONS.length] ?? ""),
      ]);
    }
    const answer = text(LONG_ANSWERS[turn % LONG_ANSWERS.length] ?? "");
    const author = turn % 9 === 4 ? reviewer : assistant;
    if (turn % 6 !== 1) return message(`long-${index}`, author, at, [answer]);
    return message(`long-${index}`, author, at, [
      {
        kind: "reasoning",
        text: "Check the latest runs before answering.",
        durationMs: 1_800,
      },
      call(`long-call-${index}`, "runs__list", { limit: 20 }, "20 runs"),
      answer,
    ]);
  });
}

export const longChat: ConversationSample = {
  title: "Long chat",
  messages: generateLongChat(300),
};

const AGREEMENT_COUNT = 40;
const UNREADABLE_AGREEMENT = 27;
const PRICING_PAGES = 6;

function readAgreement(index: number): PartTool {
  const id = `storm-read-${index}`;
  const input = { path: `agreements/agreement-${index + 1}.pdf` };
  if (index === UNREADABLE_AGREEMENT) {
    return {
      kind: "tool-trace",
      toolCallId: id,
      name: "files__read",
      status: "error",
      input,
      output: "The file is password protected and could not be opened.",
    };
  }
  return call(
    id,
    "files__read",
    input,
    index % 4 === 0 ? "Renews this quarter" : "Renews next year",
  );
}

/**
 * Settled approvals carry their outcome in the record. A call a person
 * refused, or that waited past its deadline, never ran, so its execution
 * status is `output-denied` and it has no output.
 */
const resolvedApprovals: readonly PartTool[] = [
  {
    ...call(
      "storm-approved-once",
      "calendar__create_event",
      { title: "Renewal review", day: "Thursday" },
      "Event created",
    ),
    approval: {
      id: "approval-once",
      status: "approved",
      scope: "once",
      timeoutAt: null,
    },
  },
  {
    ...call(
      "storm-approved-always",
      "notes__append",
      { note: "renewals", line: "14 renew this quarter" },
      "Line added",
    ),
    approval: {
      id: "approval-always",
      status: "approved",
      scope: "always",
      timeoutAt: null,
    },
  },
  {
    kind: "tool-trace",
    toolCallId: "storm-rejected",
    name: "mail__send",
    status: "output-denied",
    input: { to: "vendors", subject: "Renewal notice" },
    approval: {
      id: "approval-rejected",
      status: "rejected",
      scope: "once",
      timeoutAt: null,
    },
  },
  {
    kind: "tool-trace",
    toolCallId: "storm-timeout",
    name: "mail__send",
    status: "output-denied",
    input: { to: "finance", subject: "Renewal totals" },
    approval: {
      id: "approval-timeout",
      status: "timeout",
      scope: null,
      timeoutAt: minutesBefore(70),
    },
  },
  {
    kind: "tool-trace",
    toolCallId: "storm-expired",
    name: "records__update",
    status: "output-denied",
    input: { record: "agreement-12", field: "owner" },
    approval: {
      id: "approval-expired",
      status: "expired",
      scope: null,
      timeoutAt: minutesBefore(65),
    },
  },
];

export const toolStorm: ConversationSample = {
  title: "Tool storm",
  messages: [
    message("storm-1", you, minutesBefore(120), [
      text("Audit every vendor agreement and flag what renews this quarter."),
    ]),
    // Text between the stretches of work splits them into separate activity
    // runs, so the batch and the settled approvals are not folded together
    // with the forty reads.
    message("storm-2", assistant, minutesBefore(110), [
      {
        kind: "reasoning",
        text: "Read every agreement first, then check current pricing for the ones that renew, then ask before writing anything.",
        durationMs: 4_400,
      },
      ...Array.from({ length: AGREEMENT_COUNT }, (_, index) =>
        readAgreement(index),
      ),
      text(
        "Read 40 agreements. **10 renew this quarter**; one file couldn't be opened. Checking the pricing pages at once.",
      ),
      {
        kind: "tool-batch",
        id: "storm-batch",
        tools: Array.from({ length: PRICING_PAGES }, (_, index) =>
          call(
            `storm-fetch-${index}`,
            "web__fetch",
            { url: `https://example.com/pricing/vendor-${index + 1}` },
            index === 2 || index === 4 ? "Price changed" : "No change",
          ),
        ),
      },
      text("Two vendors changed prices. These steps needed your sign-off:"),
      ...resolvedApprovals,
      text(
        "The review is on your calendar and the notes are updated. The notice and the totals were not sent, and the owner change lapsed.",
      ),
    ]),
    message("storm-3", you, minutesBefore(5), [
      text("Send the renewal summary to the team."),
    ]),
    // The turn is complete and paused on a person, not still arriving, so it
    // is `sent` rather than `streaming`.
    message("storm-4", assistant, minutesBefore(4), [
      call(
        "storm-draft",
        "mail__draft",
        { to: "team", subject: "Renewals this quarter" },
        "Draft ready",
      ),
      {
        kind: "tool-trace",
        toolCallId: "storm-pending",
        name: "mail__send",
        status: "approval-requested",
        input: { to: "team", subject: "Renewals this quarter" },
        // No deadline, so the sample never reads as overdue whatever the clock says.
        approval: {
          id: "approval-pending",
          status: "pending",
          scope: null,
          timeoutAt: null,
        },
      },
    ]),
  ],
};

const ART_PALETTES: readonly (readonly [string, string, string])[] = [
  ["#f7ead5", "#e98428", "#2b2627"],
  ["#2b2627", "#e98428", "#f2b277"],
  ["#c5d2de", "#607c9a", "#2b2627"],
  ["#c1d1be", "#7b9974", "#2b2627"],
  ["#f2b277", "#9e4a45", "#f7ead5"],
];

/** An abstract composition standing in for a generated image. ASCII only, so it base64-encodes with `btoa`. */
function artSVG(seed: number, width: number, height: number): string {
  const [ground, accent, ink] = ART_PALETTES[seed % ART_PALETTES.length] ?? [
    "#ffffff",
    "#000000",
    "#000000",
  ];
  const unit = Math.min(width, height);
  const cx = width * (0.3 + ((seed * 37) % 40) / 100);
  const cy = height * (0.35 + ((seed * 23) % 30) / 100);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${ground}"/><stop offset="1" stop-color="${accent}" stop-opacity="0.35"/></linearGradient></defs>` +
    `<rect width="100%" height="100%" fill="url(#g)"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${unit * 0.22}" fill="${accent}"/>` +
    `<rect x="${width * 0.1}" y="${height * 0.72}" width="${width * 0.8}" height="${unit * 0.02}" fill="${ink}" opacity="0.8"/>` +
    `<path d="M${width * 0.55} ${height * 0.62} L${width * 0.75} ${height * 0.3} L${width * 0.92} ${height * 0.62} Z" fill="${ink}" opacity="0.85"/>` +
    `</svg>`
  );
}

/** Inline base64, the way a host holding the image bytes would pass it. */
function inlineArt(
  seed: number,
  width: number,
  height: number,
  alt: string,
): ConversationImage {
  return {
    id: `art-${seed}-${width}x${height}`,
    mediaType: "image/svg+xml",
    width,
    height,
    alt,
    base64: btoa(artSVG(seed, width, height)),
  };
}

/** Behind a URL, the way a host serving stored images would pass it. */
function linkedArt(
  seed: number,
  width: number,
  height: number,
  alt: string,
): ConversationImage {
  return {
    id: `art-${seed}-${width}x${height}`,
    mediaType: "image/svg+xml",
    width,
    height,
    alt,
    url: `data:image/svg+xml,${encodeURIComponent(artSVG(seed, width, height))}`,
  };
}

export const generatedImages: ConversationSample = {
  title: "Generated images",
  messages: [
    message("images-1", you, minutesBefore(30), [
      text("Make a cover image for the quarterly review deck. Warm, minimal."),
    ]),
    message("images-2", assistant, minutesBefore(29), [
      {
        kind: "reasoning",
        text: "Four directions, landscape for slides, warm palette.",
        durationMs: 3_000,
      },
      call(
        "images-call-1",
        "image__generate",
        { count: 4, width: 1536, height: 1024 },
        "Generated 4 images",
      ),
      {
        kind: "image",
        id: "images-part-1",
        prompt:
          "Cover for the quarterly review deck: warm, minimal, one mountain motif",
        state: "done",
        images: [1, 2, 3, 4].map((seed) =>
          inlineArt(seed, 1536, 1024, `Deck cover option ${seed}`),
        ),
      },
      text("Four directions. The second matches the deck's orange best."),
    ]),
    message("images-3", you, minutesBefore(25), [
      text("Make a square version of the second one."),
    ]),
    message("images-4", assistant, minutesBefore(24), [
      {
        kind: "image",
        id: "images-part-2",
        prompt: "Square crop of option 2",
        state: "done",
        images: [linkedArt(2, 1024, 1024, "Square version of option 2")],
      },
      text("Here it is at 1024 × 1024."),
    ]),
    message("images-5", you, minutesBefore(21), [text("And a tall one.")]),
    message("images-6", assistant, minutesBefore(20), [
      {
        kind: "image",
        id: "images-part-3",
        prompt: "Tall 9:16 version of option 2",
        state: "error",
        images: [],
      },
      text("The image tool timed out on that one."),
    ]),
    message("images-7", you, minutesBefore(2), [
      text("Try two quick square takes instead."),
    ]),
    message(
      "images-8",
      assistant,
      minutesBefore(1),
      [
        {
          kind: "image",
          id: "images-part-4",
          prompt: "Two square takes of option 2",
          state: "generating",
          images: [],
          expected: { count: 2, width: 1024, height: 1024 },
        },
      ],
      { status: "streaming" },
    ),
  ],
};

const threadReplies: readonly ConversationMessage[] = [
  message("thread-reply-1", teammate, minutesBefore(12), [
    text(
      "Can the report list follow-ups too? I'd like to track them next week.",
    ),
  ]),
  message("thread-reply-2", assistant, minutesBefore(10), [
    text(
      "Added a follow-ups section with three items, the missing test first.",
    ),
  ]),
];

export const withThread: ConversationSample = {
  title: "With a thread",
  messages: [
    message("thread-1", you, minutesBefore(42), [
      text("Write up this week's runs as a report."),
    ]),
    message(
      "thread-2",
      assistant,
      minutesBefore(41),
      [
        text(
          "Here's the report. Fourteen runs, two with deploy changes, no failures.",
        ),
        {
          kind: "block",
          block: {
            type: "report",
            data: { title: "Weekly runs", sections: 3 },
          },
        },
      ],
      {
        replies: { count: threadReplies.length, lastAt: minutesBefore(10) },
        reactions: [
          { emoji: "🎉", count: 2, mine: true },
          { emoji: "👀", count: 1, mine: false },
        ],
      },
    ),
    message("thread-3", teammate, minutesBefore(8), [
      text("Thanks, that's what I needed."),
    ]),
  ],
  thread: { parentId: "thread-2", replies: threadReplies },
};

export const failedSend: ConversationSample = {
  title: "Failed send",
  messages: [
    message("failed-1", you, minutesBefore(9), [
      text("Summarise the last three incidents."),
    ]),
    message("failed-2", assistant, minutesBefore(8), [
      text(
        "Three incidents this month: a slow export, a stuck approval, and a retry loop. All three are closed.",
      ),
    ]),
    message(
      "failed-3",
      you,
      minutesBefore(2),
      [text("Which one took longest to close?")],
      {
        status: "failed",
        error: "Couldn't send. Check your connection, then try again.",
      },
    ),
    message("failed-4", you, minutesBefore(1), [text("And who closed it?")], {
      status: "sending",
    }),
  ],
};

export const samples: readonly ConversationSample[] = [
  shortChat,
  longChat,
  toolStorm,
  generatedImages,
  withThread,
  failedSend,
];
