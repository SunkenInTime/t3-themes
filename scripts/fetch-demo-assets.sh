#!/usr/bin/env bash
# Downloads the prebuilt demo bundle + theme screenshots published by the
# "Build demo assets" workflow into public/. Use as the first step of a host's
# build command:  bash scripts/fetch-demo-assets.sh && npm run build
# Exits 0 with a warning if the release doesn't exist yet — the site builds
# fine without the assets (wireframe fallbacks, no live preview).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="https://github.com/SunkenInTime/t3-themes/releases/download/demo-assets/demo-assets.tar.gz"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

if ! curl -fsSL "$URL" -o "$TMP"; then
  echo "⚠ demo-assets release not found — building without demo/screenshots" >&2
  exit 0
fi

rm -rf "$ROOT/public/sidebar-demo" "$ROOT/public/shots"
tar -xzf "$TMP" -C "$ROOT"
echo "✓ fetched demo assets ($(du -sh "$ROOT/public/sidebar-demo" | cut -f1) demo, $(ls "$ROOT/public/shots" | wc -l | tr -d ' ') shots)"
