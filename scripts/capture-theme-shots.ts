// Takes real "photos" of every theme: boots the T3Code demo bundle
// (public/sidebar-demo, see scripts/sync-demo.sh) in headless Chromium with
// the theme injected via localStorage, and screenshots the running app into
// public/shots/<id>-<mode>.png. Run with: npm run shots
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  EMBER_THEME,
  GROVE_THEME,
  IRIS_THEME,
  OCEAN_THEME,
  T3_CHAT_THEME,
  getThemeModes,
  parseThemeFile,
  type ThemeDefinition,
} from "../src/vendor/t3code/themePalette";

const root = fileURLToPath(new URL("..", import.meta.url));
const publicDir = path.join(root, "public");
const shotsDir = path.join(publicDir, "shots");
const PORT = 4599;

if (!existsSync(path.join(publicDir, "sidebar-demo/demo.html"))) {
  console.error("✗ public/sidebar-demo not found — run scripts/sync-demo.sh first.");
  process.exit(1);
}

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://localhost:${PORT}`);
    const filePath = path.join(publicDir, path.normalize(url.pathname));
    if (!filePath.startsWith(publicDir)) throw new Error("outside root");
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] ?? "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise<void>((resolve) => server.listen(PORT, resolve));

const officialThemes: ThemeDefinition[] = [
  T3_CHAT_THEME,
  GROVE_THEME,
  OCEAN_THEME,
  EMBER_THEME,
  IRIS_THEME,
];
const communityThemes: ThemeDefinition[] = [];
const themesDir = path.join(root, "themes");
for (const fileName of (await readdir(themesDir)).filter((name) => name.endsWith(".json"))) {
  communityThemes.push(parseThemeFile(JSON.parse(await readFile(path.join(themesDir, fileName), "utf8"))));
}

await mkdir(shotsDir, { recursive: true });
const browser = await chromium.launch();
let captured = 0;

for (const definition of [...officialThemes, ...communityThemes]) {
  for (const mode of getThemeModes(definition)) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      colorScheme: mode,
    });
    await context.addInitScript(
      ({ community, themeId, appearance }) => {
        window.localStorage.setItem("t3code:themes:v1", JSON.stringify(community));
        window.localStorage.setItem("t3code:theme", themeId);
        window.localStorage.setItem("t3code:theme-follow-system", "false");
        window.localStorage.setItem("t3code:theme-appearance-mode", appearance);
      },
      { community: communityThemes, themeId: definition.id, appearance: mode },
    );

    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}/sidebar-demo/demo.html`, {
      waitUntil: "networkidle",
    });
    await page.waitForFunction(
      (id) => document.documentElement.dataset.themeId === id,
      definition.id,
      { timeout: 30_000 },
    );
    // Open a showcase thread so the shot includes message surfaces instead of
    // the empty new-thread state. Fixture titles may change upstream — if the
    // row isn't found, the default view is still a fine screenshot.
    try {
      await page.getByText("Sidebar v2 polish").first().click({ timeout: 5_000 });
    } catch {
      // keep the new-thread view
    }
    // Give the demo fixtures a beat to paint (streamed messages, sidebar rows).
    await page.waitForTimeout(2_000);

    const file = path.join(shotsDir, `${definition.id}-${mode}.png`);
    await page.screenshot({ path: file });
    console.log(`✓ ${path.relative(root, file)}`);
    captured += 1;
    await context.close();
  }
}

await browser.close();
server.close();
console.log(`${captured} screenshot(s) captured`);
