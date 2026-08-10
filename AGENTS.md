# t3-themes — agent guide

Community theme gallery for [T3Code](https://github.com/pingdotgg/t3code).
Astro static site; themes are JSON files submitted by pull request; Convex
backs the (anonymous) like buttons.

## Contributing a theme

**If your task is to add or edit a theme, read
[`docs/contributing-a-theme.md`](docs/contributing-a-theme.md) and follow it
exactly.** Short version: one new file `themes/<id>.json` in T3Code's
ThemeFile v1 format plus `author`/`description` fields, filename matching the
`id`, then `npm run validate` must pass. Touch nothing else in that PR.

## Repo map

- `themes/` — theme JSON files (the content of the gallery)
- `src/vendor/t3code/` — files vendored verbatim from the t3code repo, synced
  daily by `.github/workflows/sync-vendor.yml`. **Never edit by hand**, except
  the local shims `lib/utils.ts` and `ThemePreviewCircles.ts` which are ours.
- `src/lib/themes.ts` — loads built-in + community themes at build time
- `src/pages/` — index (gallery grid) and `themes/[id]` (detail pages)
- `scripts/` — `validate-themes.ts` (CI validation), `sync-vendor.mjs`,
  `sync-demo.sh` (builds T3Code's demo bundle), `capture-theme-shots.ts`
  (Playwright screenshots), `fetch-demo-assets.sh` (deploy-time download)
- `convex/` — likes schema + functions (needs `npx convex dev` to generate
  `_generated/`; site builds fine without it)

## Commands

```bash
npm install
npm run dev        # localhost:4321
npm run validate   # theme validation (what CI runs)
npm run build      # static build; must pass before any PR
```

The demo bundle and screenshots in `public/` are generated artifacts
(gitignored) — build them via `scripts/sync-demo.sh` + `npm run shots`, or
fetch prebuilt ones with `scripts/fetch-demo-assets.sh`. Pages fall back
gracefully when they're absent, so most site work doesn't need them.

## Constraints

- `effect` is pinned to the exact version t3code uses (currently
  `4.0.0-beta.103`) — the vendored `themePalette.ts` depends on Effect v4 APIs.
  Do not bump it independently.
- The site styles itself with T3Code's `--app-theme-*` CSS variables (see
  `src/layouts/Layout.astro`); prefer the mapped Tailwind tokens
  (`text-ink`, `bg-surface`, `border-border`, `text-accent`, …) over raw hex.
