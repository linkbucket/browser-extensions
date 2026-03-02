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

# Shared source files to include in every build
SHARED_FILES=(
  assets
  src
  vendor
)

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

  # Copy shared files
  for item in "${SHARED_FILES[@]}"; do
    cp -r "$ROOT_DIR/$item" "$target_dir/"
  done

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
