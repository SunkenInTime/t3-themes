// Auto-merges theme PRs that need no human judgment: exactly one
// themes/*.json file, every check green (validate = T3Code's own parser,
// ownership = author enforcement), a small content screen on the metadata,
// and a short grace period. Add the `hold` label to keep a PR open for
// manual review. Runs from .github/workflows/auto-merge-themes.yml.
import { execFileSync } from "node:child_process";

const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" });
const GRACE_MINUTES = 10;
// Minimal slur/abuse screen for the human-visible fields; extend as needed.
const DENY =
  /\b(nigg|fagg?ot|kike|chink|wetback|beaner|tranny|retard(?:ed)?|rape|hitler|nazi)\w*\b/i;

const prNumbers = JSON.parse(
  gh("pr", "list", "--state", "open", "--json", "number", "--limit", "50"),
).map((pr) => pr.number);

let merged = 0;

for (const number of prNumbers) {
  const pr = JSON.parse(
    gh(
      "pr",
      "view",
      String(number),
      "--json",
      "number,title,isDraft,labels,createdAt,files,headRefOid,mergeable,author",
    ),
  );
  const skip = (reason) => console.log(`#${number}: skip — ${reason}`);

  if (pr.isDraft) { skip("draft"); continue; }
  if (pr.labels.some((label) => label.name === "hold")) { skip("hold label"); continue; }
  if (Date.now() - Date.parse(pr.createdAt) < GRACE_MINUTES * 60_000) {
    skip("inside grace period"); continue;
  }
  const paths = pr.files.map((file) => file.path);
  if (paths.length !== 1 || !/^themes\/[a-z0-9-]+\.json$/.test(paths[0])) {
    skip(`not a single theme file (${paths.join(", ") || "no files"})`); continue;
  }
  if (pr.mergeable !== "MERGEABLE") { skip(`mergeable=${pr.mergeable}`); continue; }

  // Every check must have finished without failing, and validate must have
  // genuinely passed (ownership may be skipped for maintainers).
  const checks = JSON.parse(
    gh("pr", "checks", String(number), "--json", "name,bucket"),
  );
  if (checks.some((check) => check.bucket === "fail" || check.bucket === "pending")) {
    skip("checks failing or pending"); continue;
  }
  if (!checks.some((check) => check.name === "validate" && check.bucket === "pass")) {
    skip("validate check missing"); continue;
  }

  // Content screen on the fields the site renders as text.
  let theme;
  try {
    const raw = gh(
      "api", `repos/${process.env.GITHUB_REPOSITORY}/contents/${paths[0]}?ref=${pr.headRefOid}`,
      "--jq", ".content",
    );
    theme = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    skip("could not read theme file"); continue;
  }
  const visible = [theme.id, theme.name, theme.description, theme.author].join(" ");
  if (DENY.test(visible)) { skip("content screen — left for manual review"); continue; }

  try {
    gh(
      "pr", "comment", String(number), "--body",
      "Auto-merging: single theme file, all checks green. Screenshots and a site deploy are on the way — your theme will be live at https://t3themes.com in ~10 minutes. Thanks for contributing! 🎨",
    );
    gh("pr", "merge", String(number), "--squash");
    console.log(`#${number}: merged (${paths[0]} by @${pr.author.login})`);
    merged += 1;
  } catch (error) {
    console.log(`#${number}: merge failed — ${error.message}`);
  }
}

if (merged > 0) {
  // Merges made with GITHUB_TOKEN don't fire push-triggered workflows;
  // workflow_dispatch is the documented exception, so kick screenshots here.
  gh("workflow", "run", "build-demo-assets.yml");
  console.log(`dispatched build-demo-assets for ${merged} merged theme(s)`);
} else {
  console.log("nothing to merge");
}
