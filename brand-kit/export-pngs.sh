#!/bin/bash
# Export every brand-kit SVG to an upload-ready PNG at its exact intrinsic size.
# Usage:  bash brand-kit/export-pngs.sh
# Output mirrors the SVG folders under brand-kit/png/ (macOS: uses qlmanage + sips).
set -euo pipefail
cd "$(dirname "$0")"

TMP="$(mktemp -d)"
count=0
while IFS= read -r -d '' svg; do
  rel="${svg#./}"
  out="png/${rel%.svg}.png"
  mkdir -p "$(dirname "$out")"
  w=$(head -1 "$svg" | sed -n 's/.*width="\([0-9]*\)".*/\1/p')
  h=$(head -1 "$svg" | sed -n 's/.*height="\([0-9]*\)".*/\1/p')
  [ -z "$w" ] || [ -z "$h" ] && { echo "skip (no size): $rel"; continue; }
  max=$(( w > h ? w : h ))
  qlmanage -t -s "$max" -o "$TMP" "$svg" >/dev/null 2>&1
  sips -z "$h" "$w" "$TMP/$(basename "$svg").png" --out "$out" >/dev/null 2>&1
  count=$((count + 1))
done < <(find . -name "*.svg" -not -path "./png/*" -print0)

rm -rf "$TMP"
echo "Exported $count PNGs under brand-kit/png/."
