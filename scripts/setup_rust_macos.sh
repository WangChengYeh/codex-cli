#!/usr/bin/env bash
set -euo pipefail

# Setup Rust toolchain for macOS (aarch64) and add iOS device target.
# Based on README: macOS/iOS aarch64 only; no PTY usage.

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This setup script is for macOS only." >&2
  exit 1
fi

ARCH=$(uname -m)
if [[ "$ARCH" != "arm64" ]]; then
  echo "Note: README targets Apple Silicon (aarch64) only; current arch: $ARCH" >&2
fi

if ! command -v rustup >/dev/null 2>&1; then
  echo "Installing rustup (Rust toolchain manager)..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
  export PATH="$HOME/.cargo/bin:$PATH"
fi

echo "Configuring Rust toolchain..."
rustup set profile minimal
rustup default stable
rustup update

echo "Adding components (rustfmt, clippy)..."
rustup component add rustfmt clippy || true

echo "Adding targets (aarch64-apple-darwin, aarch64-apple-ios)..."
rustup target add aarch64-apple-darwin aarch64-apple-ios || true

echo "Rust setup complete. Summary:"
rustc --version
cargo --version
echo "Installed targets:"
rustup target list --installed

