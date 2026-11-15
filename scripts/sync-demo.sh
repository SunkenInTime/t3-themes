#!/usr/bin/env bash
# Builds T3Code's demo mode (the real web app on an in-browser fake server,
# see scripts/demo/) and drops the static output into public/sidebar-demo, so
# theme pages can live-preview themes, CSS included, in the actual UI.
#
# Demo mode is not in upstream T3Code. scripts/demo/t3code-demo.patch adds it
# on top of one pinned upstream commit, T3CODE_REF below. Upstream changes its
# internals daily, so bump the pin on purpose: set T3CODE_REF to a newer
# commit, run this script, fix the patch if it no longer applies or the demo
# fixtures test fails, then check the preview in a browser.
set -euo pipefail

T3CODE_REF="${T3CODE_REF:-26b63a44f9ea44297af45174dea0b133ad6730b2}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git -C "$WORK" init -q
git -C "$WORK" fetch -q --depth 1 https://github.com/pingdotgg/t3code.git "$T3CODE_REF"
git -C "$WORK" checkout -q FETCH_HEAD
git -C "$WORK" apply "$ROOT/scripts/demo/t3code-demo.patch"

# Use the pnpm version the checkout pins.
PNPM_VERSION="$(node -p "require('$WORK/package.json').packageManager.split('@')[1]")"
pnpm() { npx --yes "pnpm@$PNPM_VERSION" "$@"; }

(cd "$WORK" && pnpm install --frozen-lockfile)
# The fixtures decode through upstream's schemas; this names the field that
# drifted when a bump breaks them, instead of shipping a blank preview.
(cd "$WORK/apps/web" && pnpm exec vp test run --project unit src/demo/fixtures.test.ts)
(cd "$WORK/apps/web" && pnpm run build:demo)

# public/ may not exist on a fresh checkout; its contents are gitignored.
mkdir -p "$ROOT/public"
rm -rf "$ROOT/public/sidebar-demo"
cp -R "$WORK/apps/web/dist-demo" "$ROOT/public/sidebar-demo"

echo "✓ demo bundle for t3code@${T3CODE_REF:0:10} synced to public/sidebar-demo ($(du -sh "$ROOT/public/sidebar-demo" | cut -f1))"
