# Contributing a theme

Step-by-step instructions for adding a T3Code theme to this gallery. Written
to be followed exactly by a human or a coding agent. A theme contribution
touches **one new file** and nothing else.

## What a theme is

A single JSON file in `themes/`, in T3Code's `ThemeFile` v1 format, plus two
gallery-only metadata fields. Example of a complete, valid submission:

```json
{
  "version": 1,
  "id": "synthwave-sunset",
  "name": "Synthwave Sunset",
  "appearance": "dark",
  "author": "octocat",
  "description": "Neon magenta on deep violet, with a hot-pink accent.",
  "colors": {
    "canvas": "#16091f",
    "sidebar": "#1d0e29",
    "surface": "#241333",
    "surfaceRaised": "#2b1a3d",
    "text": "#f4e6ff",
    "textMuted": "#a98bc4",
    "border": "#3a2450",
    "accent": "#ff4fd8",
    "accentForeground": "#16091f",
    "accentSurface": "#331b47",
    "messageSurface": "#2a1740",
    "messageForeground": "#ecdcfb",
    "messageAction": "#ff4fd8",
    "messageActionForeground": "#16091f",
    "codeBackground": "#1a0c26",
    "codeForeground": "#d3b2f0",
    "terminalBackground": "#16091f",
    "terminalForeground": "#f4e6ff",
    "terminalCursor": "#ff4fd8"
  }
}
```

## Field rules

Validation runs the file through T3Code's own parser (vendored at
`src/vendor/t3code/themePalette.ts`), so these rules are the app's rules:

| Field | Rule |
| --- | --- |
| `version` | Required. Must be exactly `1`. |
| `id` | Lowercase letters, digits, hyphens; must start with a letter/digit; max 48 chars (`^[a-z0-9][a-z0-9-]{0,47}$`). Must not be a reserved id: `system`, `light`, `dark`, `t3-chat`, `grove`, `ocean`, `ember`, `iris`, or any `t3-*` legacy alias. |
| `name` | Required. Display name, 48 characters or fewer. |
| `appearance` | Required. `"light"` or `"dark"` — the theme's base mode. |
| `colors` | Required. At least one role. Keys must be valid color roles (the full list is `THEME_COLOR_ROLES` in `src/vendor/t3code/themePalette.ts` — read it there, do not trust a hardcoded list elsewhere). Values must be hex: `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa`. Named colors, `rgb()`, `hsl()` are rejected. |
| `variants` | Optional. An object keyed by the **other** appearance only (a dark theme may have `variants.light`, never `variants.dark`), containing another `colors`-shaped object. |
| `author` | Gallery-only. Contributor's GitHub username (validated against GitHub username rules). Should match the PR author. |
| `description` | Gallery-only. String, 200 characters or fewer. |

Gallery-only fields are ignored by T3Code on import, so they are safe to keep
in the file.

## Filename

`themes/<id>.json`, where `<id>` is exactly the `id` field —
`themes/synthwave-sunset.json` for the example above. CI rejects mismatches
and duplicate ids.

## Choosing colors well

Any role you omit falls back to the default **T3 Chat** palette for your
appearance — which is pink. A dark theme that only sets `canvas` will render
with pink text and surfaces. To preview coherently, set at minimum:

- Surfaces: `canvas`, `sidebar`, `surface`, `surfaceRaised`, `messageSurface`, `codeBackground`, `terminalBackground`
- Foregrounds: `text`, `textMuted`, `messageForeground`, `codeForeground`, `terminalForeground`
- Accents: `accent`, `accentForeground`, `accentSurface`, `messageAction`, `messageActionForeground`
- Structure: `border`

Keep contrast honest: `text` must be readable on `canvas` **and** `surface`;
`accentForeground` sits on `accent`; `messageActionForeground` sits on
`messageAction` (that pair is the send button). Adding a `variants` block for
the other appearance gets the theme both light and dark screenshots and the
hover crossfade on its gallery card — strongly encouraged.

The easiest way to produce a complete palette is inside T3Code itself:
Settings → Themes → Create theme (guided editor) or Import theme (accepts
VS Code theme JSON), then export and paste the result here.

## Validate before opening a PR

```bash
npm install
npm run validate
```

Must print `✓ N theme file(s) valid`. Errors are T3Code's own parser messages
(e.g. `"foo" is not a supported theme color role`) — fix and re-run. To eyeball
the result, `npm run dev` and open `http://localhost:4321/themes/<id>/`
(previews use the wireframe fallback locally; real screenshots are generated
in CI after merge).

## Open the PR

- One theme per pull request.
- The diff must contain only the new `themes/<id>.json` file. Do not modify
  `src/vendor/` (synced from upstream), other themes, or site code in the same
  PR.
- Title suggestion: `theme: <Name>`.
- CI re-runs the same validation; a green check means the theme imports
  cleanly into T3Code.

After merge, everything is automatic: a workflow screenshots the theme inside
the real T3Code app and the next deploy publishes its gallery page.
