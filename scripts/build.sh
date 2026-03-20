#!/usr/bin/env bash
#
# Build script for Linkbucket browser extension.
# Produces distributable zip files for Chrome and Firefox.
#
# Usage:
#   ./scripts/build.sh           # build both
#   ./scripts/build.sh chrome    # build Chrome only
#   ./scripts/build.sh firefox   # build Firefox only

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
NODE_MODULES="$ROOT_DIR/node_modules"

# Verify dependencies are installed
if [[ ! -d "$NODE_MODULES" ]]; then
  echo "Error: node_modules not found. Run 'npm install' first." >&2
  exit 1
fi

# Verify manifest versions match package.json version
PKG_VERSION=$(node -p "require('$ROOT_DIR/package.json').version")
for manifest in "$ROOT_DIR"/manifest.*.json; do
  MANIFEST_VERSION=$(node -p "require('$manifest').version")
  if [[ "$PKG_VERSION" != "$MANIFEST_VERSION" ]]; then
    echo "Error: version mismatch — package.json ($PKG_VERSION) != $(basename "$manifest") ($MANIFEST_VERSION)" >&2
    exit 1
  fi
done

copy_vendor_files() {
  local target_dir="$1"

  # tom-select
  mkdir -p "$target_dir/vendor/tom-select"
  cp "$NODE_MODULES/tom-select/dist/js/tom-select.complete.min.js" "$target_dir/vendor/tom-select/"
  cp "$NODE_MODULES/tom-select/dist/css/tom-select.min.css" "$target_dir/vendor/tom-select/"

  # webextension-polyfill
  mkdir -p "$target_dir/vendor/webextension-polyfill"
  cp "$NODE_MODULES/webextension-polyfill/dist/browser-polyfill.min.js" "$target_dir/vendor/webextension-polyfill/"
}

build_target() {
  local target="$1"
  local manifest_src="$ROOT_DIR/manifest.${target}.json"
  local target_dir="$DIST_DIR/$target"
  local zip_file="$DIST_DIR/linkbucket-${target}.zip"

  if [[ ! -f "$manifest_src" ]]; then
    echo "Error: $manifest_src not found" >&2
    exit 1
  fi

  echo "Building $target..."

  # Clean and create target directory
  rm -rf "$target_dir"
  mkdir -p "$target_dir"

  # Copy source files
  cp -r "$ROOT_DIR/assets" "$target_dir/"
  cp -r "$ROOT_DIR/src" "$target_dir/"

  # Copy vendor files from node_modules
  copy_vendor_files "$target_dir"

  # Copy the browser-specific manifest
  cp "$manifest_src" "$target_dir/manifest.json"

  # Create zip (try zip first, fall back to 7z)
  rm -f "$zip_file"
  if command -v zip &>/dev/null; then
    (cd "$target_dir" && zip -r -q "$zip_file" .)
  elif command -v 7z &>/dev/null; then
    (cd "$target_dir" && 7z a -tzip -bso0 -bsp0 "$zip_file" .)
  else
    echo "Error: neither 'zip' nor '7z' found. Install one to create archives." >&2
    exit 1
  fi

  echo "  -> $zip_file"
}

# Determine which targets to build
if [[ $# -eq 0 ]]; then
  targets=(chrome firefox)
else
  targets=("$@")
fi

for target in "${targets[@]}"; do
  case "$target" in
    chrome|firefox)
      build_target "$target"
      ;;
    *)
      echo "Unknown target: $target (expected 'chrome' or 'firefox')" >&2
      exit 1
      ;;
  esac
done

echo "Done."
