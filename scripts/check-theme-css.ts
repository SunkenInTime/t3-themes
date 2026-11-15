// Runs every theme's `css` through T3Code's own CSS guard (vendored at
// src/vendor/t3code/themeCss.ts) in headless Chromium, and fails when the
// guard would drop anything. T3Code drops every declaration that could load a
// file, so a theme that trips the guard looks different in the app from what
// was reviewed, or is trying to load something. validate-themes.ts has a text
// check for early feedback, but CSS escapes such as `u\72l()` get past text
// checks; this one sees what the browser parsed. Run with: npm run check-css
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const themesDir = path.join(root, "themes");

const themes: { label: string; css: string }[] = [];
for (const fileName of (await readdir(themesDir)).filter((n) => n.endsWith(".json")).sort()) {
  try {
    const data = JSON.parse(await readFile(path.join(themesDir, fileName), "utf8"));
    if (typeof data?.css === "string") themes.push({ label: `themes/${fileName}`, css: data.css });
  } catch {
    // validate-themes.ts reports unreadable files.
  }
}

if (themes.length === 0) {
  console.log("✓ no theme CSS to check");
  process.exit(0);
}

const bundle = await build({
  entryPoints: [path.join(root, "scripts/theme-css-guard-page.ts")],
  bundle: true,
  format: "iife",
  write: false,
  tsconfig: path.join(root, "tsconfig.json"),
  logLevel: "silent",
});

const browser = await chromium.launch();
const errors: string[] = [];
try {
  for (const theme of themes) {
    const page = await browser.newPage();
    // Nothing in here should reach the network, whatever the CSS says.
    await page.route("**/*", (route) => route.abort());
    await page.setContent("<!doctype html><html><body></body></html>");
    await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
    const dropped: string[] = await page.evaluate(
      (css) => (globalThis as any).droppedByGuard(css),
      theme.css,
    );
    await page.close();
    if (dropped.length > 0) {
      errors.push(
        `${theme.label}: T3Code would drop ${dropped.length} part(s) of this CSS, because they could load files ` +
          `(url() that is not data: or #id, image-set(), src(), @import, or a backslash escape in a value):\n` +
          dropped.map((entry) => `      ${entry}`).join("\n"),
      );
    }
  }
} finally {
  await browser.close();
}

if (errors.length > 0) {
  console.error(`✗ ${errors.length} theme(s) with CSS that T3Code would change:\n`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`✓ CSS in ${themes.length} theme(s) passes T3Code's guard unchanged`);
