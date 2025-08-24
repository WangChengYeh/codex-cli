# Codex CLI Cross-Platform Makefile

.PHONY: help dev build clean install test lint format deps setup
.PHONY: android-setup android-build android-debug android-release android-install android-test android-clean
.PHONY: ios-setup ios-build ios-debug ios-release ios-clean
.PHONY: desktop-dev desktop-build
.PHONY: check-android-env check-ios-env

# Default target
help:
	@echo "Codex CLI Cross-Platform Build System"
	@echo ""
	@echo "🖥️  Desktop Targets:"
	@echo "  dev / desktop-dev     - Launch development server (macOS)"
	@echo "  build / desktop-build - Build production app (macOS)"
	@echo ""
	@echo "📱 Android Targets:"
	@echo "  android-setup         - Set up Android development environment"
	@echo "  android-debug          - Build debug APK"
	@echo "  android-release        - Build release APK"
	@echo "  android-install        - Install APK on connected device"
	@echo "  android-test          - Run device tests"
	@echo "  android-test-mcp      - Run MCP-based APK testing"
	@echo "  android-clean         - Clean Android build artifacts"
	@echo ""
	@echo "🍎 iOS Targets (Future):"
	@echo "  ios-setup             - Set up iOS development environment"
	@echo "  ios-debug             - Build debug IPA"
	@echo "  ios-release           - Build release IPA"
	@echo "  ios-clean             - Clean iOS build artifacts"
	@echo ""
	@echo "🔧 Development Targets:"
	@echo "  install / deps        - Install dependencies"
	@echo "  test                  - Run tests"
	@echo "  lint                  - Run linter"
	@echo "  format                - Format code"
	@echo "  clean                 - Clean all build artifacts"
	@echo "  setup                 - Complete project setup"

# =============================================================================
# Environment Variables and Configuration
# =============================================================================

# Android configuration
ANDROID_TARGET ?= aarch64-linux-android
ANDROID_API_LEVEL ?= 34
ANDROID_MIN_API ?= 24

# Build configuration
BUILD_TYPE ?= debug
RUST_LOG ?= info

# =============================================================================
# Environment Checks
# =============================================================================

check-rust:
	@command -v rustup >/dev/null 2>&1 || { echo "❌ Rust not found. Please install Rust first."; exit 1; }
	@command -v cargo >/dev/null 2>&1 || { echo "❌ Cargo not found. Please install Rust first."; exit 1; }

check-node:
	@command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Please install Node.js 18+."; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm not found. Please install pnpm."; exit 1; }

check-android-env:
	@echo "🔍 Checking Android environment..."
	@if [ -z "$$ANDROID_HOME" ]; then \
		echo "⚠️  ANDROID_HOME not set. Please install Android SDK and set environment variables:"; \
		echo "   export ANDROID_HOME=$$HOME/Android/Sdk"; \
		echo "   export PATH=$$PATH:$$ANDROID_HOME/tools:$$ANDROID_HOME/platform-tools"; \
		echo "   Download from: https://developer.android.com/studio"; \
		exit 1; \
	else \
		echo "✅ ANDROID_HOME: $$ANDROID_HOME"; \
	fi
	@command -v adb >/dev/null 2>&1 || { echo "❌ adb not found. Please install Android SDK platform-tools."; exit 1; }
	@echo "✅ Android environment ready"

check-ios-env:
	@echo "🔍 Checking iOS environment..."
	@command -v xcodebuild >/dev/null 2>&1 || { echo "❌ Xcode not found. Please install Xcode from App Store."; exit 1; }
	@echo "✅ iOS environment ready"

# =============================================================================
# Desktop Development
# =============================================================================

# Launch development server
dev desktop-dev: check-rust check-node
	@echo "🖥️  Starting desktop development server..."
	pnpm tauri dev

# Build production desktop app
build desktop-build: check-rust check-node
	@echo "🏗️  Building desktop production app..."
	pnpm tauri build

# =============================================================================
# Android Development
# =============================================================================

# Set up Android development environment
android-setup: check-rust check-node
	@echo "🔧 Setting up Android development environment..."
	./scripts/setup-android.sh

# Build debug Android APK
android-debug android-build: check-rust check-node
	@echo "📱 Building Android debug APK..."
	@if [ ! -f "android-build/build-android.sh" ]; then \
		echo "❌ Android not set up. Run 'make android-setup' first."; \
		exit 1; \
	fi
	cd android-build && ./build-android.sh debug $(ANDROID_TARGET)

# Build release Android APK
android-release: check-rust check-node
	@echo "🚀 Building Android release APK..."
	@if [ ! -f "android-build/build-android.sh" ]; then \
		echo "❌ Android not set up. Run 'make android-setup' first."; \
		exit 1; \
	fi
	@if [ -z "$$RELEASE_KEY_PASSWORD" ] || [ -z "$$RELEASE_STORE_PASSWORD" ]; then \
		echo "⚠️  Please set release keystore passwords:"; \
		echo "   export RELEASE_KEY_PASSWORD='your_key_password'"; \
		echo "   export RELEASE_STORE_PASSWORD='your_store_password'"; \
		exit 1; \
	fi
	cd android-build && ./build-android.sh release $(ANDROID_TARGET)

# Install APK on connected device
android-install: check-android-env
	@echo "📲 Installing APK on connected device..."
	@if [ ! -f "android-build/test-device.sh" ]; then \
		echo "❌ Android not set up. Run 'make android-setup' first."; \
		exit 1; \
	fi
	cd android-build && ./test-device.sh

# Run comprehensive Android device tests
android-test:
	@echo "🧪 Running Android device tests..."
	@if [ ! -f "scripts/simulate-android-test.js" ]; then \
		echo "❌ Test scripts not found. Please ensure project is properly set up."; \
		exit 1; \
	fi
	node scripts/simulate-android-test.js
	@echo "📱 For real device testing with Android SDK, run: make android-install"

# Run MCP-based Android APK testing
android-test-mcp:
	@echo "📱 Running MCP Android APK testing..."
	@if [ ! -f "scripts/mcp-android-test.js" ]; then \
		echo "❌ MCP test scripts not found. Please ensure project is properly set up."; \
		exit 1; \
	fi
	node scripts/mcp-android-test.js
	@echo "✅ MCP Android testing complete! See MCP-ANDROID-TEST-REPORT.md for details."

# Clean Android build artifacts
android-clean:
	@echo "🧹 Cleaning Android build artifacts..."
	rm -rf android-build/apk/*
	rm -rf target/aarch64-linux-android/
	rm -rf target/armv7-linux-androideabi/
	rm -rf target/i686-linux-android/
	rm -rf target/x86_64-linux-android/
	@if [ -d "src-tauri/gen/android" ]; then rm -rf src-tauri/gen/android; fi

# List connected Android devices
android-devices: check-android-env
	@echo "📱 Connected Android devices:"
	adb devices

# View Android app logs
android-logs: check-android-env
	@echo "📊 Monitoring Android app logs..."
	adb logcat | grep -i "codex\|tauri\|rust\|webview"

# =============================================================================
# iOS Development (Future)
# =============================================================================

# Set up iOS development environment
ios-setup: check-rust check-node check-ios-env
	@echo "🍎 Setting up iOS development environment..."
	@echo "⚠️  iOS support coming in Phase 4 - see README.md"
	rustup target add aarch64-apple-ios
	@echo "✅ iOS Rust target added"

# Build debug iOS IPA
ios-debug: check-rust check-node check-ios-env
	@echo "📱 Building iOS debug IPA..."
	@echo "⚠️  iOS support coming in Phase 4 - see README.md"

# Build release iOS IPA
ios-release: check-rust check-node check-ios-env
	@echo "🚀 Building iOS release IPA..."
	@echo "⚠️  iOS support coming in Phase 4 - see README.md"

# Clean iOS build artifacts
ios-clean:
	@echo "🧹 Cleaning iOS build artifacts..."
	rm -rf target/aarch64-apple-ios/
	@if [ -d "src-tauri/gen/ios" ]; then rm -rf src-tauri/gen/ios; fi

# =============================================================================
# Development Tools
# =============================================================================

# Complete project setup
setup: check-rust check-node
	@echo "🚀 Setting up Codex CLI development environment..."
	@echo "📦 Installing dependencies..."
	pnpm install
	cargo fetch
	@echo "🎯 Adding Rust targets..."
	rustup target add aarch64-linux-android
	rustup target add aarch64-apple-ios
	@echo "🔧 Setting up development tools..."
	@if [ ! -d "android-build" ]; then make android-setup; fi
	@echo "✅ Setup complete! Run 'make help' to see available targets."

# Install dependencies
install deps: check-rust check-node
	@echo "📦 Installing dependencies..."
	pnpm install
	cargo fetch

# Run tests
test: check-rust check-node
	@echo "🧪 Running tests..."
	cargo test
	@if command -v pnpm test >/dev/null 2>&1; then pnpm test; fi

# Run linter
lint: check-rust check-node
	@echo "🔍 Running linter..."
	cargo clippy -- -D warnings
	@if command -v pnpm lint >/dev/null 2>&1; then pnpm lint; fi

# Format code
format: check-rust check-node
	@echo "✨ Formatting code..."
	cargo fmt
	@if command -v pnpm format >/dev/null 2>&1; then pnpm format; fi

# Clean all build artifacts
clean:
	@echo "🧹 Cleaning all build artifacts..."
	cargo clean
	rm -rf target/
	rm -rf node_modules/.cache/
	rm -rf dist/
	@if [ -d "android-build/apk" ]; then rm -rf android-build/apk/*; fi
	@if [ -d "src-tauri/gen" ]; then rm -rf src-tauri/gen; fi

# =============================================================================
# Platform Detection and Utilities
# =============================================================================

# Show platform information
platform-info:
	@echo "🖥️  Platform Information:"
	@echo "  OS: $$(uname -s)"
	@echo "  Architecture: $$(uname -m)"
	@echo "  Rust toolchain: $$(rustc --version 2>/dev/null || echo 'Not installed')"
	@echo "  Node.js: $$(node --version 2>/dev/null || echo 'Not installed')"
	@echo "  pnpm: $$(pnpm --version 2>/dev/null || echo 'Not installed')"
	@if command -v adb >/dev/null 2>&1; then echo "  ADB: $$(adb --version | head -1)"; fi
	@if command -v xcodebuild >/dev/null 2>&1; then echo "  Xcode: $$(xcodebuild -version | head -1)"; fi

# Check project status
status:
	@echo "📊 Project Status:"
	@echo "  Git branch: $$(git branch --show-current 2>/dev/null || echo 'Not a git repo')"
	@echo "  Git status: $$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ') files changed"
	@echo "  Desktop build: $$([ -d "target/release" ] && echo "Available" || echo "Not built")"
	@echo "  Android setup: $$([ -d "android-build" ] && echo "Complete" || echo "Run 'make android-setup'")"
	@echo "  Dependencies: $$([ -d "node_modules" ] && [ -f "Cargo.lock" ] && echo "Installed" || echo "Run 'make install'")"

# =============================================================================
# Aliases and Shortcuts
# =============================================================================

# Quick aliases
run: dev
a: android-debug
ai: android-install
at: android-test
atm: android-test-mcp
d: dev
b: build