// Build-time lookup for the pre-rendered theme screenshots produced by
// scripts/capture-theme-shots.ts. Pages fall back to the ThemeWireframe when
// no shot exists (e.g. the demo bundle wasn't built).
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ThemeAppearance } from "../vendor/t3code/themePalette";

const publicDir = fileURLToPath(new URL("../../public", import.meta.url));

export function themeShot(id: string, mode: ThemeAppearance): string | null {
  return existsSync(path.join(publicDir, "shots", `${id}-${mode}.png`))
    ? `/shots/${id}-${mode}.png`
    : null;
}
