#!/usr/bin/env bash
set -euo pipefail

echo "rustc: $(command -v rustc || echo 'not found')"
echo "cargo: $(command -v cargo || echo 'not found')"
if command -v rustc >/dev/null; then rustc --version; fi
if command -v cargo >/dev/null; then cargo --version; fi

if command -v rustup >/dev/null; then
  echo "Installed targets:" && rustup target list --installed
  echo "Expected macOS/iOS targets per README:" && echo "- aarch64-apple-darwin" && echo "- aarch64-apple-ios"
else
  echo "rustup not found — run scripts/setup_rust_macos.sh first." >&2
fi

