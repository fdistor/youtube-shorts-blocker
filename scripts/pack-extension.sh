#!/usr/bin/env bash
# Build a clean Chrome Web Store upload zip (extension files only).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "JSON.parse(require('fs').readFileSync('manifest.json','utf8')).version")"
OUT_DIR="${ROOT}/dist"
OUT_ZIP="${OUT_DIR}/block-youtube-shorts-v${VERSION}.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT_ZIP"

# Paths CWS upload needs (no test/, .git, store drafts, docs, scripts).
INCLUDE=(
  manifest.json
  background.js
  content.js
  content.css
  icons
  popup
  shared
)

if command -v zip >/dev/null 2>&1; then
  zip -r -q "$OUT_ZIP" "${INCLUDE[@]}" -x "*.DS_Store" "*__MACOSX*"
else
  # Portable fallback when `zip` is not installed.
  python3 - "$OUT_ZIP" "${INCLUDE[@]}" <<'PY'
import sys, zipfile
from pathlib import Path

out = Path(sys.argv[1])
roots = [Path(p) for p in sys.argv[2:]]

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
    for root in roots:
        if root.is_file():
            zf.write(root, root.as_posix())
            continue
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            if path.name == ".DS_Store" or "__MACOSX" in path.parts:
                continue
            zf.write(path, path.as_posix())
print(f"Wrote {out}")
PY
fi

echo "Packed: $OUT_ZIP"
python3 - "$OUT_ZIP" <<'PY'
import sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as zf:
    for info in zf.infolist():
        print(f"{info.file_size:8d}  {info.filename}")
PY
