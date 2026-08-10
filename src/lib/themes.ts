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
};

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
    } satisfies GalleryTheme;
  })
  .sort((a, b) => a.definition.label.localeCompare(b.definition.label));

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
