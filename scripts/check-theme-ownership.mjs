// Enforces theme ownership on pull requests:
//  - added theme files must declare the PR author as their `author`
//  - modified/deleted theme files must be owned (base version's `author`)
//    by the PR author; authorless themes count as maintainer-owned
// Runs in CI with BASE_SHA and PR_AUTHOR set; maintainers and the
// `override-ownership` label are exempted in the workflow, not here.
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const baseSha = process.env.BASE_SHA;
const prAuthor = process.env.PR_AUTHOR?.toLowerCase();
if (!baseSha || !prAuthor) {
  console.error("✗ BASE_SHA and PR_AUTHOR must be set");
  process.exit(1);
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function authorOf(json, label) {
  try {
    const author = JSON.parse(json).author;
    return typeof author === "string" ? author.toLowerCase() : null;
  } catch {
    console.error(`✗ ${label}: could not parse JSON to read its author`);
    process.exit(1);
  }
}

const diff = git("diff", "--name-status", "--no-renames", `${baseSha}...HEAD`, "--", "themes")
  .trim();
const errors = [];

for (const line of diff ? diff.split("\n") : []) {
  const [status, filePath] = line.split("\t");
  if (!filePath?.endsWith(".json")) continue;

  if (status === "A") {
    const author = authorOf(await readFile(filePath, "utf8"), filePath);
    if (author !== prAuthor) {
      errors.push(
        `${filePath}: new themes must set "author" to the PR opener ` +
          `(@${prAuthor}), found ${author ? `"${author}"` : "no author"}`,
      );
    }
  } else {
    const owner = authorOf(git("show", `${baseSha}:${filePath}`), `${filePath} (base)`);
    if (owner !== prAuthor) {
      errors.push(
        `${filePath}: owned by ${owner ? `@${owner}` : "the maintainers"} — only they ` +
          `(or a maintainer with the override-ownership label) may change or remove it`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(`✗ ownership check failed:\n`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log("✓ theme ownership ok");
