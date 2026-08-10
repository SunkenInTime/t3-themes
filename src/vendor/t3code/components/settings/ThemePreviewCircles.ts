// Local shim for t3code's `ThemePreviewCircles.tsx`, which pulls in
// lucide-react and app-internal tooltip components. ThemeWireframe only needs
// the ThemeCardPreviewColors type; the role list mirrors upstream's
// THEME_PREVIEW_ROLES.
import type { ThemeColors } from "../../themePalette";

export const THEME_PREVIEW_ROLES = [
  "sidebar",
  "canvas",
  "surface",
  "accentSurface",
  "accent",
  "messageSurface",
  "messageAction",
] as const;

export type ThemePreviewRole = (typeof THEME_PREVIEW_ROLES)[number];
export type ThemeCardPreviewColors = Readonly<Pick<ThemeColors, ThemePreviewRole>>;
