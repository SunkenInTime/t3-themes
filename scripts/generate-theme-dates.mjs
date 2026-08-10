// Writes public/theme-dates.json: first-commit time (ms epoch) per theme
// file. Runs in the assets workflow, which has full git history; deploy hosts
// do shallow clones where `git log` can't answer this, so the site build
// reads this manifest (fetched with the demo assets) instead.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const themesDir = path.join(root, "themes");
const dates = {};

for (const fileName of (await readdir(themesDir)).filter((name) => name.endsWith(".json"))) {
  const log = execFileSync(
    "git",
    ["log", "--diff-filter=A", "--follow", "--format=%ct", "--", `themes/${fileName}`],
    { cwd: root, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  const first = log.at(-1);
  if (first) dates[fileName] = Number(first) * 1000;
}

mkdirSync(path.join(root, "public"), { recursive: true });
writeFileSync(
  path.join(root, "public", "theme-dates.json"),
  `${JSON.stringify(dates, null, 2)}\n`,
);
console.log(`✓ theme-dates.json: ${Object.keys(dates).length} theme(s)`);
