// Validates every file in themes/ with T3Code's own parser (vendored), plus
// gallery-specific rules: id must match the filename, ids must be unique, and
// the optional author/description metadata must be well-formed.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { themeSubmissionLink } from "../src/lib/themeSubmission";
import { themeCssLoadsRemoteFiles } from "../src/vendor/t3code/shared/themeCss";
import {
  parseThemeFile,
  serializeThemeFile,
  THEME_FILE_VERSION,
} from "../src/vendor/t3code/themePalette";

const themesDir = fileURLToPath(new URL("../themes", import.meta.url));
const GITHUB_USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

function validateColorParserCompatibility(): void {
  const theme = parseThemeFile({
    version: THEME_FILE_VERSION,
    id: "css-color-smoke",
    name: "CSS Color Smoke",
    appearance: "light",
    colors: {
      canvas: "rgb(248 251 255 / 50%)",
      border: "#abc",
      accent: "rebeccapurple",
      focus: "color(display-p3 0.2 0.4 1)",
    },
    css: '[data-workspace-area="conversation"] { background: coral; }',
    variants: {
      dark: {
        accent: "hsl(210 100% 50% / 25%)",
      },
    },
  });

  assert.match(theme.colors.canvas, /^oklch\(.+ \/ 0\.5\)$/);
  assert.equal(
    JSON.parse(serializeThemeFile(theme)).css,
    '[data-workspace-area="conversation"] { background: coral; }',
    "Theme import/export must preserve decorative CSS",
  );
  for (const css of [42, "x".repeat(20_001)]) {
    assert.throws(
      () => parseThemeFile({ ...JSON.parse(serializeThemeFile(theme)), css }),
      /Theme CSS must be text/,
    );
  }
  assert.match(theme.colors.border, /^oklch\(/);
  assert.match(theme.colors.accent, /^oklch\(/);
  assert.match(theme.colors.focus, /^oklch\(/);
  assert.match(theme.variants?.dark?.accent ?? "", /^oklch\(.+ \/ 0\.25\)$/);
  assert.throws(
    () =>
      parseThemeFile({
        version: THEME_FILE_VERSION,
        id: "invalid-css-color",
        name: "Invalid CSS Color",
        appearance: "light",
        colors: { accent: "var(--accent)" },
      }),
    /literal CSS color/,
  );
}

const entries = (await readdir(themesDir)).filter((name) => name.endsWith(".json")).sort();
const errors: string[] = [];
const seenIds = new Set<string>();

const smallSubmission = themeSubmissionLink("themes/small.json", '{"name":"Small"}');
assert.equal(new URL(smallSubmission.url).searchParams.get("value"), '{"name":"Small"}');
assert.equal(smallSubmission.contentsPrefilled, true);
const largeSubmission = themeSubmissionLink("themes/animated.json", "🪸".repeat(2_000));
assert.equal(new URL(largeSubmission.url).searchParams.get("filename"), "themes/animated.json");
assert.equal(new URL(largeSubmission.url).searchParams.has("value"), false);
assert.equal(largeSubmission.contentsPrefilled, false);

try {
  validateColorParserCompatibility();
} catch (cause) {
  errors.push(`T3Code color parser compatibility check failed: ${(cause as Error).message}`);
}

for (const fileName of entries) {
  const label = `themes/${fileName}`;
  let data: unknown;
  try {
    data = JSON.parse(await readFile(path.join(themesDir, fileName), "utf8"));
  } catch (cause) {
    errors.push(`${label}: not valid JSON (${(cause as Error).message})`);
    continue;
  }

  let themeId: string;
  try {
    themeId = parseThemeFile(data).id;
  } catch (cause) {
    errors.push(`${label}: rejected by T3Code's theme parser — ${(cause as Error).message}`);
    continue;
  }

  if (`${themeId}.json` !== fileName) {
    errors.push(`${label}: file must be named "${themeId}.json" to match its theme id`);
  }
  if (seenIds.has(themeId)) {
    errors.push(`${label}: duplicate theme id "${themeId}"`);
  }
  seenIds.add(themeId);

  const record = data as Record<string, unknown>;
  if (typeof record.css === "string" && themeCssLoadsRemoteFiles(record.css)) {
    errors.push(`${label}: CSS must not load external files; embed images with data: URLs`);
  }
  if (record.author !== undefined) {
    if (typeof record.author !== "string" || !GITHUB_USERNAME_PATTERN.test(record.author)) {
      errors.push(`${label}: "author" must be a GitHub username`);
    }
  }
  if (record.description !== undefined) {
    if (typeof record.description !== "string" || record.description.length > 200) {
      errors.push(`${label}: "description" must be a string of 200 characters or fewer`);
    }
  }
}

if (errors.length > 0) {
  console.error(`✗ ${errors.length} problem(s) found:\n`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`✓ ${entries.length} theme file(s) valid`);
