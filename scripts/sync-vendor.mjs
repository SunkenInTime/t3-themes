// Re-fetches the vendored T3Code files from upstream. Run by the scheduled
// sync-vendor workflow; safe to run locally too. Only files vendored verbatim
// are listed here — the shims (lib/utils.ts, ThemePreviewCircles.ts) are ours.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const UPSTREAM = "https://raw.githubusercontent.com/pingdotgg/t3code/main";
const FILES = [
  {
    remote: `${UPSTREAM}/apps/web/src/themePalette.ts`,
    local: "src/vendor/t3code/themePalette.ts",
  },
  {
    remote: `${UPSTREAM}/apps/web/src/components/settings/ThemeWireframe.tsx`,
    local: "src/vendor/t3code/components/settings/ThemeWireframe.tsx",
  },
];

const root = fileURLToPath(new URL("..", import.meta.url));
let changed = 0;

for (const file of FILES) {
  const response = await fetch(file.remote);
  if (!response.ok) {
    console.error(`✗ ${file.remote}: HTTP ${response.status}`);
    process.exit(1);
  }
  const next = await response.text();
  const localPath = path.join(root, file.local);
  const current = await readFile(localPath, "utf8").catch(() => null);
  if (current === next) {
    console.log(`= ${file.local} (unchanged)`);
    continue;
  }
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, next);
  console.log(`↻ ${file.local} updated`);
  changed += 1;
}

console.log(changed > 0 ? `${changed} file(s) updated` : "vendor up to date");
