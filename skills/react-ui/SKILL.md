---
name: react-ui
description: Build or change a React interface with @corbits/react-ui, the component library for agent and workflow surfaces (chat, tool calls, approvals, runs, artifacts, charts, layout, controls). Use when a task adds or edits screens in an app that depends on @corbits/react-ui, or asks which component to use.
---

# @corbits/react-ui

Props-in, markup-out React components for agent products, styled by one Tailwind v4 token theme. Components never fetch; the host passes data as props.

Rules for writing screens (theme, wording, accessibility, actions, imports) are in [AGENTS.md](AGENTS.md); read it first.

## Choose a component

Find the task, open that reference for props, and use what is there before writing markup. Each reference lists every exported component, hook or helper with its props or signature and the types they name; check it before using a prop.

| Task                                                                          | Reference                                  |
| ----------------------------------------------------------------------------- | ------------------------------------------ |
| Conversation container, thread, typing and status indicators                  | [conversation](references/conversation.md) |
| Messages, reasoning, tool calls, tool approval, activity                      | [messages](references/messages.md)         |
| Prompt box, dictation, tool picker                                            | [composer](references/composer.md)         |
| Artifacts, attachments, media viewer, sources, generated images               | [media](references/media.md)               |
| Page shell, top bar, sidebar, panels, settings, theme provider                | [layout](references/layout.md)             |
| Buttons, inputs, selects, tabs, filters, dialogs, menus, toasts               | [controls](references/controls.md)         |
| Tables, charts, stats, badges, status, empty and loading states, run progress | [data-display](references/data-display.md) |
| Hooks for prompts, attachments, files, copy, selection, popovers              | [hooks-input](references/hooks-input.md)   |
| Hooks for history, reading position, resizing, tabs, reduced motion           | [hooks-view](references/hooks-view.md)     |
| Message, attachment, chart and theme helpers (`groupActivity`, ...)           | [helpers](references/helpers.md)           |
| Workflow run, metrics and now-item helpers                                    | [helpers-runs](references/helpers-runs.md) |
