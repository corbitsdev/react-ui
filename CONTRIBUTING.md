# Contributing

## Development

```sh
bun install
bun run check
```

`bun run check` runs typecheck, lint, format check and unit tests. `bun run format` rewrites the tree.

Contributors sign the [CLA](CLA.md) on their first PR; the CLA bot explains how.

`bun run test:e2e` checks the built package: every `exports` target exists and the
root entry loads under Node with every optional peer blocked. Run `bun run build`
first. CI also runs `bun run contrast-test` (theme contrast floors, reads
`dist/styles.css`) and `bun run dep-guard` (forbidden imports, see `AGENTS.md`)
after the build.

## Theme and stories

Change tokens in `src/theme.css`, then run `bun run build`; `dist/` is generated.
A failing contrast pair prints `FAIL <ratio>:1 (>=<floor>) <mode> <pair>`. Fix it
with a naming rule in `checksFor`, never a hardcoded hex pair.

`bun run stories` starts the Ladle workbench over every component against
`src/theme.css`; `bun run stories:build` writes a static copy to `build/`. A new
component ships with a story for each meaningful state (loading, empty, error).

## Commit messages

Commit subjects and PR titles follow [Conventional Commits](https://www.conventionalcommits.org): `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`, `perf`, and `chore(release): x.y.z` for releases.
Add `!` only for public API breaks: removed or renamed exports, changed signatures, newly required params. Peer and dependency range changes are `build(deps):` with no `!`.
Keep subjects imperative, lowercase after the colon, 72 characters or less, and free of ticket IDs.
Every PR links its issue with a `Closes <issue id>` line in the PR body.

## Releasing

Releases are manual. On a clean, up-to-date `main`:

```sh
npm version <patch|minor> -m "chore(release): %s"
git push --follow-tags
gh release create "v$(node -p 'require("./package.json").version')" --generate-notes
npm publish
```

Bump minor only for breaking API changes; everything else is a patch. `prepack` builds `dist/` from the tagged commit.
