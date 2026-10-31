# Using @corbits/react-ui

Rules for an agent writing screens with this package. Props for every component are in [references/](references/); the task-to-reference map is in [SKILL.md](SKILL.md).

1. **Reuse first.** Use the component that covers the job, and compose from its exported parts (`Message` with `MessageContent`, `PromptInput` with `PromptInputSubmit`).
2. **Props are the contract.** Pass data in as props and handle events through callbacks; fetching and subscriptions stay in the host. Use only props the reference lists.
3. **Theme once.** Import `@corbits/react-ui/styles.css` once at the app root, before your CSS, and mount `ThemeProvider` near the root. Apps that build their own Tailwind sheet import `@corbits/react-ui/theme.css`.
4. **Style with tokens.** Use the token utilities (`bg-card`, `text-muted-foreground`, `border-border`) and the `--radius`, `--chart-*` values. To restyle, override tokens in your CSS. Dark mode is a `.dark` class on an ancestor, so components stay free of mode checks.
5. **Wording is configuration.** Component text comes from its text props (`labels`, `label`, `title`, `caption`, children), fed from one config module, and screen copy lives there too.
6. **Keep the accessibility the library gives you.** Give every icon-only control an `aria-label`, pair colour with text or an icon, use `Button`, `Input` and `Select` for interactive elements, and leave focus styles and reduced-motion handling as shipped.
7. **One action bar, one way per action.** Each screen has a single place for its primary actions (`PageShell`, `TopBar`; `MessageActions` or `BulkActionBar` for rows), and each action is one control.
8. **Import from the root.** `@corbits/react-ui` covers everything except modules the package lists as their own subpath in `exports` (optional-peer modules); those import from that subpath and need their peer installed. Paths in `exports` are the public surface.
9. **Server Components.** Stateful modules carry `"use client"`; import them directly.
10. **Missing component.** Say so and compose the closest ones.
