import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ThemeCardPreviewColors, ThemePreviewRole } from "../vendor/t3code/components/settings/ThemePreviewCircles";
import { THEME_PREVIEW_ROLES } from "../vendor/t3code/components/settings/ThemePreviewCircles";
import {
  EMBER_THEME,
  GROVE_THEME,
  IRIS_THEME,
  OCEAN_THEME,
  T3_CHAT_THEME,
  getThemeColorsForMode,
  getThemeModes,
  parseThemeFile,
  serializeThemeFile,
  type ThemeAppearance,
  type ThemeColors,
  type ThemeDefinition,
} from "../vendor/t3code/themePalette";

export type GalleryTheme = {
  definition: ThemeDefinition;
  official: boolean;
  author?: string;
  description?: string;
  /** Exact JSON handed to the "Copy JSON" button (importable into T3Code). */
  json: string;
  /** Repo path of the source file for community themes. */
  sourcePath?: string;
  /** When the theme landed in the repo (ms epoch); 0 when unknown. */
  addedAt: number;
};

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

// The assets workflow publishes first-commit dates (full git history isn't
// available on shallow-cloning deploy hosts); themes missing from it — e.g. a
// brand-new theme racing the workflow — fall back to git, then file mtime.
function loadDatesManifest(): Record<string, number> {
  try {
    return JSON.parse(
      readFileSync(path.join(repoRoot, "public", "theme-dates.json"), "utf8"),
    ) as Record<string, number>;
  } catch {
    return {};
  }
}
const datesManifest = loadDatesManifest();

/** First-commit time of a theme file, for "newest" sorting. */
function addedAtOf(fileName: string): number {
  const fromManifest = datesManifest[fileName];
  if (fromManifest) return fromManifest;
  try {
    const log = execFileSync(
      "git",
      ["log", "--diff-filter=A", "--follow", "--format=%ct", "--", `themes/${fileName}`],
      { cwd: repoRoot, encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .filter(Boolean);
    const first = log.at(-1);
    if (first) return Number(first) * 1000;
  } catch {
    // not a git checkout — fall through
  }
  try {
    return statSync(path.join(repoRoot, "themes", fileName)).mtimeMs;
  } catch {
    return 0;
  }
}

/** Resolved colors for both modes; single-mode themes reuse their only mode. */
export function modePair(definition: ThemeDefinition): { light: ThemeColors; dark: ThemeColors } {
  const light = getThemeColorsForMode(definition, "light");
  const dark = getThemeColorsForMode(definition, "dark");
  return { light: light ?? dark!, dark: dark ?? light! };
}

/** A `light-dark(...)` CSS value for a role, resolving by system scheme. */
export function lightDark(definition: ThemeDefinition, role: keyof ThemeColors): string {
  const pair = modePair(definition);
  return pair.light[role] === pair.dark[role]
    ? pair.light[role]
    : `light-dark(${pair.light[role]}, ${pair.dark[role]})`;
}

const OFFICIAL_DEFINITIONS: ReadonlyArray<ThemeDefinition> = [
  T3_CHAT_THEME,
  GROVE_THEME,
  OCEAN_THEME,
  EMBER_THEME,
  IRIS_THEME,
];

const communityData = import.meta.glob<Record<string, unknown>>("../../themes/*.json", {
  eager: true,
  import: "default",
});
const communityRaw = import.meta.glob<string>("../../themes/*.json", {
  eager: true,
  query: "?raw",
  import: "default",
});

export const officialThemes: GalleryTheme[] = OFFICIAL_DEFINITIONS.map((definition) => ({
  definition,
  official: true,
  author: "t3-tools",
  description: `Ships with T3Code as the built-in ${definition.label} theme.`,
  json: serializeThemeFile(definition),
  addedAt: 0,
}));

export const communityThemes: GalleryTheme[] = Object.entries(communityData)
  .map(([path, data]) => {
    const definition = parseThemeFile(data);
    const author = typeof data.author === "string" ? data.author : undefined;
    const description = typeof data.description === "string" ? data.description : undefined;
    const fileName = path.split("/").pop() ?? `${definition.id}.json`;
    return {
      definition,
      official: false,
      author,
      description,
      json: communityRaw[path] ?? serializeThemeFile(definition),
      sourcePath: `themes/${fileName}`,
      addedAt: addedAtOf(fileName),
    } satisfies GalleryTheme;
  })
  .sort((a, b) => b.addedAt - a.addedAt);

export const allThemes: GalleryTheme[] = [...officialThemes, ...communityThemes];

export function getGalleryTheme(id: string): GalleryTheme | undefined {
  return allThemes.find((theme) => theme.definition.id === id);
}

export function previewColors(
  definition: ThemeDefinition,
  mode: ThemeAppearance,
): ThemeCardPreviewColors | null {
  const colors = getThemeColorsForMode(definition, mode);
  if (!colors) return null;
  return Object.fromEntries(
    THEME_PREVIEW_ROLES.map((role: ThemePreviewRole) => [role, colors[role]]),
  ) as Record<ThemePreviewRole, string>;
}

export type WireframePane = { colors: ThemeCardPreviewColors; clip?: "left" | "right" };

/** Panes for the mini preview: split light/dark when a theme ships both. */
export function wireframePanes(definition: ThemeDefinition): WireframePane[] {
  const modes = getThemeModes(definition);
  if (modes.length === 2) {
    return [
      { colors: previewColors(definition, "light")!, clip: "left" },
      { colors: previewColors(definition, "dark")!, clip: "right" },
    ];
  }
  return [{ colors: previewColors(definition, modes[0] ?? definition.appearance)! }];
}

export function resolvedModes(
  definition: ThemeDefinition,
): Array<{ mode: ThemeAppearance; colors: ThemeColors }> {
  const modes = getThemeModes(definition);
  return modes.map((mode) => ({ mode, colors: getThemeColorsForMode(definition, mode)! }));
}
