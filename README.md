# T3 Themes

A community gallery of custom themes for [T3Code](https://github.com/pingdotgg/t3code).
Static Astro site; themes live in this repo as JSON and are submitted by pull
request. Likes are the only dynamic feature, backed by Convex.

Every preview is rendered with T3Code's **own** theme code: `themePalette.ts`
and `ThemeWireframe.tsx` are vendored verbatim from the MIT-licensed t3code
repo (see `src/vendor/t3code/`) and kept current by a scheduled workflow.

## Submitting a theme

Full field-by-field instructions (also written for coding agents) live in
[`docs/contributing-a-theme.md`](docs/contributing-a-theme.md). The short
version:

1. Build your theme in T3Code (Settings → Themes → Create theme, or import a
   VS Code theme) and export/copy its JSON.
2. Add it as `themes/<id>.json`, where `<id>` matches the `id` field
   (lowercase letters, numbers, hyphens). Add two gallery-only fields —
   T3Code ignores them on import:

   ```jsonc
   {
     "version": 1,
     "id": "my-theme",
     "name": "My Theme",
     "appearance": "dark",
     "author": "your-github-username",
     "description": "One or two sentences, max 200 chars.",
     "colors": { "canvas": "#0b0e14", "accent": "#7aa2f7" /* ... */ }
   }
   ```

3. Open a pull request. CI validates your file with T3Code's actual parser
   (`parseThemeFile`), so if CI is green the theme imports cleanly.

Any color role you omit falls back to the default T3 Chat palette for your
theme's appearance — override at least the surfaces (`canvas`, `sidebar`,
`surface`, `messageSurface`) and `accent` so your theme previews well.
A `variants` block for the other appearance gets you the split light/dark card.

The two `themes/*.json` files currently in the repo are placeholder samples —
remove them once real submissions exist.

## Development

```bash
npm install
npm run dev        # site at localhost:4321 (likes disabled without Convex)
npm run validate   # what CI runs against themes/
npm run build      # static build to dist/
```

### Likes (Convex)

```bash
npx convex dev     # first run: creates a project, writes convex/_generated
```

Put the deployment URL in `.env` as `PUBLIC_CONVEX_URL=https://<name>.convex.cloud`,
then restart `npm run dev`. Deploy with `npx convex deploy` and set
`PUBLIC_CONVEX_URL` in your host's env (Vercel/Netlify).

Likes are anonymous: one like per theme per browser (random client id in
localStorage). Deliberately not sybil-proof; if inflation ever becomes a real
problem, add GitHub sign-in-to-like on top of the same table.

### Live preview (real T3Code UI in an iframe)

Theme detail pages can embed T3Code's demo mode — the actual web app running
against an in-browser mock server (from PR
[pingdotgg/t3code#4909](https://github.com/pingdotgg/t3code/pull/4909)). Build
it with `scripts/sync-demo.sh` (needs pnpm; ~20 MB output into
`public/sidebar-demo`, gitignored — run it in CI/deploy rather than committing
it). The script merges upstream main into the PR branch because the demo
predates the theme library; once #4909 merges, point it at main (see comments
in the script). Without the bundle the Live Preview section simply doesn't
render.

How theming works: the bundle is served from our origin, so it shares
localStorage with the gallery. The preview button writes the theme under
T3Code's own keys (`t3code:themes:v1`, `t3code:theme`) before mounting the
iframe, and the app applies it exactly as if the visitor had imported it.

### Theme screenshots

Cards and detail pages show real screenshots of T3Code running each theme,
captured from the demo bundle with headless Chromium:

```bash
scripts/sync-demo.sh   # once: build the demo bundle
npm run shots          # boots the demo per theme/mode, saves public/shots/*.png
npm run build
```

`public/shots` is gitignored. You rarely need to run this locally: the
**Build demo assets** workflow (`build-demo-assets.yml`) does both steps in CI
— weekly, on demand, and whenever `themes/` or the vendored files change — and
publishes the result as a tarball on the rolling `demo-assets` release. Deploys
just download it:

```bash
# host build command
bash scripts/fetch-demo-assets.sh && npm run build
```

Pages fall back to the vendored `ThemeWireframe` mini preview when a shot is
missing, so the site builds fine without the assets. Cards crossfade to the
other appearance's shot on hover.

### Vendor sync

`.github/workflows/sync-vendor.yml` re-fetches the two vendored files from
`pingdotgg/t3code@main` daily, re-runs validation and the build against them,
and opens a PR when they changed. Run manually with `npm run sync-vendor`.
The shims in `src/vendor/t3code/lib/` and `ThemePreviewCircles.ts` are ours
(upstream's versions depend on private packages) — if a sync PR fails to
build, check whether upstream added imports the shims need to cover.

## To do before going live

- Create the Convex deployment and set `PUBLIC_CONVEX_URL`.
- Pick a host and run `scripts/sync-demo.sh` + `npm run shots` in its build
  step (before `npm run build`).
- Delete the sample themes once real submissions exist.
