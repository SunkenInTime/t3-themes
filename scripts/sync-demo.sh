#!/usr/bin/env bash
# Builds T3Code's demo mode — the real web app bundled against its in-browser
# mock server — and drops the static output into public/sidebar-demo so theme
# detail pages can live-preview themes in the actual UI.
#
# The demo comes from maria-rcks' PR #4909, which forked BEFORE the theme
# library (PR #5226) merged, so we merge upstream main into it to get custom
# theme support. Once #4909 merges upstream, replace all of this with a plain
# clone of pingdotgg/t3code@main:
#   DEMO_MERGE_MAIN=0 DEMO_REPO=https://github.com/pingdotgg/t3code.git DEMO_REF=main scripts/sync-demo.sh
set -euo pipefail

REPO="${DEMO_REPO:-https://github.com/maria-rcks/t3code.git}"
REF="${DEMO_REF:-fix/new-marketing-website}"
MERGE_MAIN="${DEMO_MERGE_MAIN:-1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git clone --branch "$REF" "$REPO" "$WORK"

if [ "$MERGE_MAIN" = "1" ]; then
  git -C "$WORK" remote add upstream https://github.com/pingdotgg/t3code.git
  git -C "$WORK" fetch upstream main
  # The only expected conflict is the marketing download page, which the demo
  # build doesn't use — keep the branch's version.
  git -C "$WORK" -c user.email=sync@t3-themes -c user.name=t3-themes-sync \
    merge upstream/main --no-edit || {
    git -C "$WORK" checkout --ours apps/marketing/src/pages/download.astro
    git -C "$WORK" add -A
    git -C "$WORK" -c user.email=sync@t3-themes -c user.name=t3-themes-sync \
      -c core.hooksPath=/dev/null commit --no-verify --no-edit
  }
  # Upstream dropped the @fontsource packages; the demo entry still imports
  # them on the PR branch.
  sed -i.bak '/@fontsource/d' "$WORK/apps/web/src/demo/main.tsx"
  rm -f "$WORK/apps/web/src/demo/main.tsx.bak"
fi

(cd "$WORK" && pnpm install)
(cd "$WORK/apps/web" && pnpm run build:sidebar-demo)

# public/ may not exist on a fresh checkout — its contents are gitignored.
mkdir -p "$ROOT/public"
rm -rf "$ROOT/public/sidebar-demo"
cp -R "$WORK/apps/marketing/public/sidebar-demo" "$ROOT/public/sidebar-demo"

# The stock demo pins the theme to dark for the marketing hero; the gallery
# injects its own selection via localStorage, so drop that line.
sed -i.bak '/t3code:theme", "dark"/d' "$ROOT/public/sidebar-demo/demo.html"
rm -f "$ROOT/public/sidebar-demo/demo.html.bak"

echo "✓ demo bundle synced to public/sidebar-demo ($(du -sh "$ROOT/public/sidebar-demo" | cut -f1))"
