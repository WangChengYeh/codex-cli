# Codex CLI Desktop Makefile

.PHONY: help dev build clean install test lint format deps

# Default target
help:
	@echo "Codex CLI Desktop - Available targets:"
	@echo "  dev       - Launch development server"
	@echo "  build     - Build production app"
	@echo "  clean     - Clean build artifacts"
	@echo "  install   - Install dependencies"
	@echo "  test      - Run tests"
	@echo "  lint      - Run linter"
	@echo "  format    - Format code"
	@echo "  deps      - Install all dependencies"

# Launch development server on macOS
dev:
	pnpm tauri dev

# Build production app for macOS
build:
	pnpm tauri build

# Clean build artifacts
clean:
	cargo clean
	rm -rf target/
	rm -rf node_modules/.cache/
	rm -rf dist/

# Install dependencies
install deps:
	pnpm install
	cargo fetch

# Run tests
test:
	cargo test
	pnpm test

# Run linter
lint:
	cargo clippy -- -D warnings
	pnpm lint

# Format code
format:
	cargo fmt
	pnpm format

# Quick launch alias
run: dev