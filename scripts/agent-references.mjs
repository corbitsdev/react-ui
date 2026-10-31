// Generates skills/react-ui/references/<group>.md from the built declarations in
// dist/: props per exported component, the types they name, and the exported hooks
// and helpers, so an agent reads the real API instead of guessing it. The files are
// build output and ship in the package. A public module that is in no group fails
// the run, so a new component cannot ship undocumented.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, "skills/react-ui/references");
const MAX_SIZE = 16_000;

const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

const GROUPS = {
  layout: {
    title: "app shell and page layout",
    modules: [
      "blocks/login/auth-layout",
      "ui/boot-screen",
      "ui/card",
      "ui/corbits-mark",
      "ui/inspector-shell",
      "ui/kind-card-grid",
      "ui/library-page-header",
      "ui/list-detail",
      "ui/notifications-bell",
      "ui/now-cards",
      "ui/page-panel",
      "ui/page-shell",
      "ui/panel",
      "ui/panel-tabs",
      "ui/profile-card",
      "ui/section",
      "ui/settings-panel",
      "ui/sidebar",
      "ui/sidebar-item-row",
      "ui/sidebar-panel",
      "ui/sidebar-search",
      "ui/theme-provider",
      "ui/theme-toggle",
      "ui/top-bar",
      "ui/view-toggle",
    ],
  },
  controls: {
    title: "buttons, inputs, filters, dialogs, menus and toasts",
    modules: [
      "blocks/login/login-form",
      "ui/bulk-action-bar",
      "ui/button",
      "ui/checkbox",
      "ui/command-palette",
      "ui/confirm-button",
      "ui/dialog",
      "ui/file-input",
      "ui/filter-bar",
      "ui/filter-chip",
      "ui/horizontal-stepper",
      "ui/input",
      "ui/intake-form",
      "ui/menu",
      "ui/mic-permission-dialog",
      "ui/run-now-button",
      "ui/select",
      "ui/selection-checkbox",
      "ui/switch",
      "ui/tabs",
      "ui/textarea",
      "ui/toast",
      "ui/tooltip",
    ],
  },
  "data-display": {
    title: "tables, stats, charts, status, avatars, empty and loading states",
    modules: [
      "ui/animated-number",
      "ui/avatar",
      "ui/badge",
      "ui/bar-chart",
      "ui/block-card",
      "ui/category-bars",
      "ui/chart-frame",
      "ui/csv-table",
      "ui/empty-state",
      "ui/gate-block",
      "ui/live-run-banner",
      "ui/live-status-line",
      "ui/progress-checklist",
      "ui/quote-card",
      "ui/rich-empty-state",
      "ui/shimmer-text",
      "ui/skeleton",
      "ui/sortable-table",
      "ui/sparkline",
      "ui/stat-grid",
      "ui/status-dot",
      "ui/step-list",
      "ui/table",
      "ui/time-series-chart",
      "ui/token-mosaic",
      "ui/trace-waterfall",
    ],
  },
  conversation: {
    title: "conversation container, thread and status indicators",
    modules: [
      "ui/conversation",
      "ui/conversation-divider",
      "ui/conversation-earlier",
      "ui/conversation-map",
      "ui/conversation-thread",
      "ui/thinking-indicator",
      "ui/thinking-label",
      "ui/thinking-mark",
      "ui/typing-indicator",
    ],
  },
  messages: {
    title: "messages, reasoning, activity and tool calls",
    modules: [
      "ui/activity",
      "ui/message",
      "ui/message-actions",
      "ui/message-fold",
      "ui/message-parts",
      "ui/message-reactions",
      "ui/message-replies",
      "ui/reasoning",
      "ui/tool",
      "ui/tool-approval",
      "ui/tool-group",
    ],
  },
  composer: {
    title: "prompt input, dictation and tool picker",
    modules: [
      "ui/dictation-status-line",
      "ui/mic-button",
      "ui/prompt-input",
      "ui/prompt-input-toolbar",
      "ui/tool-picker",
      "ui/voice-waveform",
    ],
  },
  media: {
    title: "artifacts, attachments, media and sources",
    modules: [
      "ui/artifact-body",
      "ui/artifact-notice",
      "ui/attachment-drop-zone",
      "ui/attachments",
      "ui/compare-body",
      "ui/dither-canvas",
      "ui/embed-body",
      "ui/generated-images",
      "ui/media-viewer",
      "ui/provider-mark",
      "ui/research-body",
      "ui/sources",
    ],
  },
  "hooks-input": {
    title:
      "hooks for prompts, attachments, files, copy, selection and popovers",
    modules: [
      "hooks/use-attachments",
      "hooks/use-command-palette-navigation",
      "hooks/use-controllable-state",
      "hooks/use-copy",
      "hooks/use-dismissable-popover",
      "hooks/use-file-drop",
      "hooks/use-list-selection",
      "hooks/use-media-viewer",
      "hooks/use-prompt-input",
    ],
  },
  "hooks-view": {
    title: "hooks for history, reading position, resizing, tabs and motion",
    modules: [
      "hooks/use-history-window",
      "hooks/use-prefers-reduced-motion",
      "hooks/use-reading-position",
      "hooks/use-resizable",
      "hooks/use-scroll-current-into-view",
      "hooks/use-tab-drag",
      "hooks/use-tabs",
    ],
  },
  helpers: {
    title: "helpers for messages, attachments, charts and theme",
    modules: [
      "lib/artifact",
      "lib/attachment-limits",
      "lib/chart-palette",
      "lib/conversation-activity",
      "lib/media-kind",
      "lib/prompt-tokens",
      "lib/relative-time",
      "lib/theme",
    ],
  },
  "helpers-runs": {
    title: "helpers for workflow runs, metrics and now items",
    modules: [
      "lib/metrics",
      "lib/now-item",
      "lib/workflow-display-flow",
      "lib/workflow-run",
      "lib/workflow-run-error",
      "lib/workflow-run-progress",
    ],
  },
};

const moduleGroup = new Map(
  Object.entries(GROUPS).flatMap(([group, { modules }]) =>
    modules.map((module) => [module, group]),
  ),
);

const SUBPATHS = Object.keys(PKG.exports)
  .filter((entry) => entry.startsWith("./ui/"))
  .map((entry) => entry.slice(2));

function publicModules() {
  const barrel = readFileSync(join(DIST, "index.d.ts"), "utf8");
  const reExported = [...barrel.matchAll(/from "\.\/(.+)\.js"/g)].map(
    (match) => match[1],
  );
  return [...new Set([...reExported, ...SUBPATHS])].sort();
}

const printFlags =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
  ts.TypeFormatFlags.WriteArrowStyleSignature;

function firstSentence(text) {
  const flat = text
    .replace(/\s+/g, " ")
    .replace(/\b(e\.g|i\.e)\./g, "$1")
    .trim();
  const end = flat.search(/[.!?](\s|$)/);
  return end === -1 ? flat : flat.slice(0, end + 1);
}

function shortType(text) {
  return text
    .replace(/import\("[^"]*"\)\./g, "")
    .replace(/\bReact\./g, "")
    .replace(
      /string \| number \| bigint \| boolean \| ReactElement<[^|]*?> \| Iterable<ReactNode> \| ReactPortal \| Promise<[^|]*?> \| null \| undefined/g,
      "ReactNode",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function declarationText(declaration) {
  return declaration
    .getText()
    .replace(/^export /, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/import\("[^"]*"\)\./g, "")
    .replace(/\bReact\./g, "")
    .replace(/\n\s*\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n");
}

const isComponentModule = (module) => /^(ui|blocks)\//.test(module);

function describeModules(modules) {
  const files = modules.map((module) => join(DIST, `${module}.d.ts`));
  const program = ts.createProgram(files, {
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
  });
  const checker = program.getTypeChecker();
  const isOwn = (declaration) =>
    declaration.getSourceFile().fileName.startsWith(DIST);
  const typeText = (type) =>
    shortType(checker.typeToString(type, undefined, printFlags));

  function propsOf(type, location) {
    let native = false;
    const props = [];
    for (const symbol of checker.getPropertiesOfType(type)) {
      const declaration = symbol.declarations?.[0];
      if (!declaration || !isOwn(declaration)) {
        native = true;
        continue;
      }
      props.push({
        name: symbol.name,
        optional: (symbol.flags & ts.SymbolFlags.Optional) !== 0,
        type: typeText(
          checker.getTypeOfSymbolAtLocation(symbol, location),
        ).replace(/ \| undefined$/, ""),
        doc: firstSentence(
          ts.displayPartsToString(symbol.getDocumentationComment(checker)),
        ),
      });
    }
    return { props, native };
  }

  const types = new Map();
  const described = modules.map((module, index) => {
    const file = program.getSourceFile(files[index]);
    const moduleSymbol = file && checker.getSymbolAtLocation(file);
    const components = [];
    const functions = [];
    for (const exported of moduleSymbol
      ? checker.getExportsOfModule(moduleSymbol)
      : []) {
      const symbol =
        exported.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(exported)
          : exported;
      const declaration = symbol.declarations?.[0];
      if (!declaration || !isOwn(declaration)) continue;
      if (
        symbol.flags &
        (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)
      ) {
        if (!types.has(exported.name)) {
          types.set(exported.name, declarationText(declaration));
        }
        continue;
      }
      if (!(symbol.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Variable)))
        continue;
      const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
      const signature = type.getCallSignatures()[0];
      const summary = firstSentence(
        ts.displayPartsToString(symbol.getDocumentationComment(checker)),
      );
      if (!/^[A-Z]/.test(exported.name)) {
        if (signature) {
          functions.push({
            name: exported.name,
            summary,
            signature: shortType(
              checker.signatureToString(signature, undefined, printFlags),
            ),
          });
        }
        continue;
      }
      const propsParam = signature?.getParameters()[0];
      const propsType = propsParam
        ? checker.getTypeOfSymbolAtLocation(propsParam, declaration)
        : undefined;
      const { props, native } = propsType
        ? propsOf(propsType, declaration)
        : { props: [], native: false };
      components.push({ name: exported.name, summary, props, native });
    }
    return { module, components, functions };
  });
  return { described, types };
}

const identifiers = (text) => text.match(/\b[A-Z][A-Za-z0-9]*\b/g) ?? [];

function typesFor(entries, types) {
  const wanted = new Map();
  const queue = entries.flatMap((entry) => [
    ...entry.components.flatMap((component) =>
      component.props.flatMap((prop) => identifiers(prop.type)),
    ),
    ...entry.functions.flatMap((fn) => identifiers(fn.signature)),
  ]);
  while (queue.length > 0) {
    const name = queue.pop();
    const text = types.get(name);
    if (text === undefined || wanted.has(name)) continue;
    wanted.set(name, text);
    queue.push(...identifiers(text));
  }
  return [...wanted].sort(([a], [b]) => a.localeCompare(b));
}

function render(group, entries, types, withPropDocs) {
  const subpaths = SUBPATHS.map((subpath) => `\`${subpath}\``).join(", ");
  const lines = [
    "<!-- Generated from dist/ by scripts/agent-references.mjs during the build. -->",
    "",
    `# react-ui: ${GROUPS[group].title}`,
    "",
    `Props per exported component. \`?\` marks optional. \`+native\` means the component also accepts the native props of the element it renders (\`className\`, \`onClick\`, ...). Import from \`@corbits/react-ui\` unless the module is a package subpath (${subpaths}), which imports from \`@corbits/react-ui/<subpath>\`.`,
    "",
  ];
  for (const { module, components, functions } of entries) {
    lines.push(`## ${module}`, "");
    for (const component of components) {
      const tag = component.native ? " +native" : "";
      lines.push(
        `### ${component.name}${tag}${component.summary ? ` — ${component.summary}` : ""}`,
      );
      for (const prop of component.props) {
        const doc = withPropDocs && prop.doc ? ` — ${prop.doc}` : "";
        lines.push(
          `${prop.name}${prop.optional ? "?" : ""}: ${prop.type}${doc}`,
        );
      }
      lines.push("");
    }
    for (const fn of functions) {
      lines.push(
        `### ${fn.name}${fn.summary ? ` — ${fn.summary}` : ""}`,
        `${fn.name}${fn.signature}`,
        "",
      );
    }
  }
  const named = typesFor(entries, types);
  if (named.length > 0) {
    lines.push("## Types", "", "```ts");
    for (const [, text] of named) lines.push(text);
    lines.push("```", "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

if (!existsSync(join(DIST, "index.d.ts"))) {
  console.error("dist/ is missing; run the build first.");
  process.exit(1);
}

const { described, types } = describeModules(publicModules());
const documented = described.filter(
  ({ module, components, functions }) =>
    components.length > 0 ||
    (!isComponentModule(module) && functions.length > 0),
);
const ungrouped = documented
  .map(({ module }) => module)
  .filter((module) => !moduleGroup.has(module));
if (ungrouped.length > 0) {
  console.error(
    `Public modules in no group (add them to GROUPS in scripts/agent-references.mjs):\n${ungrouped.map((module) => `  ${module}`).join("\n")}`,
  );
  process.exit(1);
}
const stale = [...moduleGroup.keys()].filter(
  (module) => !documented.some((entry) => entry.module === module),
);
if (stale.length > 0) {
  console.error(
    `Grouped modules that export nothing public to document:\n${stale.map((module) => `  ${module}`).join("\n")}`,
  );
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
for (const group of Object.keys(GROUPS)) {
  const entries = documented.filter(
    ({ module }) => moduleGroup.get(module) === group,
  );
  let content = render(group, entries, types, true);
  if (content.length > MAX_SIZE) content = render(group, entries, types, false);
  if (content.length > MAX_SIZE) {
    console.error(
      `${group}.md is ${content.length} characters; split the group.`,
    );
    process.exit(1);
  }
  const path = join(OUT, `${group}.md`);
  writeFileSync(path, content);
  console.log(`${path}: ${content.length} characters`);
}
