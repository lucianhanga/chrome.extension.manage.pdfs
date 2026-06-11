#!/usr/bin/env bash
#
# Build and package the extension into a Chrome Web Store-ready ZIP.
# Output: dist-package/pdf-manager-v<version>.zip
#
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(node -p "require('./package.json').version")"
MANIFEST_VERSION="$(node -p "require('./public/manifest.json').version")"
OUT_DIR="dist-package"
ZIP_NAME="pdf-manager-v${VERSION}.zip"

# Guard: package.json and manifest.json versions must agree.
if [ "$VERSION" != "$MANIFEST_VERSION" ]; then
  echo -e "${RED}FAILURE: version mismatch — package.json=${VERSION}, manifest.json=${MANIFEST_VERSION}${NC}"
  echo -e "${YELLOW}Bump both to the same value before packaging.${NC}"
  exit 1
fi

echo -e "${YELLOW}Building production bundle...${NC}"
pnpm run build

# Guard: required files must exist in dist/.
for f in manifest.json background.js app.html app.js icons/128.png; do
  if [ ! -f "dist/$f" ]; then
    echo -e "${RED}FAILURE: dist/$f missing after build${NC}"
    exit 1
  fi
done

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR/$ZIP_NAME"

echo -e "${YELLOW}Zipping dist/ -> ${OUT_DIR}/${ZIP_NAME}...${NC}"
# Zip the *contents* of dist/ so manifest.json sits at the archive root.
( cd dist && zip -r -q "../${OUT_DIR}/${ZIP_NAME}" . -x '*.DS_Store' )

SIZE="$(du -h "$OUT_DIR/$ZIP_NAME" | cut -f1)"
echo -e "${GREEN}SUCCESS: packaged v${VERSION} (${SIZE}) -> ${OUT_DIR}/${ZIP_NAME}${NC}"
echo -e "${GREEN}Upload this ZIP at https://chrome.google.com/webstore/devconsole${NC}"
