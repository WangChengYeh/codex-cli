# Makefile Quick Reference Guide

## 🚀 Quick Start

```bash
# Complete setup (recommended first run)
make setup

# Desktop development
make dev        # Start development server
make build      # Build production app

# Android development  
make android-setup     # Set up Android environment
make android-debug     # Build debug APK
make android-install   # Install on connected device
make android-test      # Run comprehensive tests
```

## 📱 Android Development Workflow

### Initial Setup
```bash
# 1. Set up Android environment
make android-setup

# 2. Build debug APK
make android-debug

# 3. Connect Android device and install
make android-install

# 4. Run tests
make android-test
```

### Development Cycle
```bash
# Build and test cycle
make android-debug && make android-install && make android-test

# Using shortcuts
make a && make ai && make at
```

### Production Build
```bash
# Set release keystore passwords
export RELEASE_KEY_PASSWORD='your_key_password'
export RELEASE_STORE_PASSWORD='your_store_password'

# Build release APK
make android-release
```

## 🔧 Development Commands

### Environment Checks
```bash
make platform-info    # Show system information
make status           # Show project status
make android-devices  # List connected Android devices
```

### Build Management  
```bash
make clean            # Clean all build artifacts
make android-clean    # Clean Android-specific builds
make ios-clean        # Clean iOS builds (future)
```

### Code Quality
```bash
make test             # Run all tests
make lint             # Run linter (cargo clippy + pnpm lint)
make format           # Format code (cargo fmt + pnpm format)
```

## 📊 Make Target Categories

### 🖥️ Desktop Targets
| Target | Description |
|--------|-------------|
| `dev` / `desktop-dev` | Launch development server |
| `build` / `desktop-build` | Build production app |

### 📱 Android Targets  
| Target | Description |
|--------|-------------|
| `android-setup` | Set up Android development environment |
| `android-debug` | Build debug APK |
| `android-release` | Build release APK (requires signing keys) |
| `android-install` | Install APK on connected device |
| `android-test` | Run comprehensive device tests |
| `android-clean` | Clean Android build artifacts |
| `android-devices` | List connected Android devices |
| `android-logs` | Monitor Android app logs |

### 🍎 iOS Targets (Future)
| Target | Description |
|--------|-------------|
| `ios-setup` | Set up iOS development environment |
| `ios-debug` | Build debug IPA |
| `ios-release` | Build release IPA |
| `ios-clean` | Clean iOS build artifacts |

### 🔧 Development Targets
| Target | Description |
|--------|-------------|
| `setup` | Complete project setup |
| `install` / `deps` | Install dependencies |
| `test` | Run tests |
| `lint` | Run linter |
| `format` | Format code |
| `clean` | Clean all build artifacts |

### 🛠️ Utility Targets
| Target | Description |
|--------|-------------|
| `platform-info` | Show platform information |
| `status` | Show project status |
| `help` | Show help menu |

## ⚡ Quick Shortcuts

| Shortcut | Full Target | Description |
|----------|-------------|-------------|
| `make run` | `make dev` | Start development server |
| `make d` | `make dev` | Start development server |
| `make b` | `make build` | Build production app |
| `make a` | `make android-debug` | Build Android debug APK |
| `make ai` | `make android-install` | Install Android APK |
| `make at` | `make android-test` | Run Android tests |

## 🔧 Configuration Variables

### Android Configuration
```bash
# Set Android target architecture (default: aarch64-linux-android)
make android-debug ANDROID_TARGET=armv7-linux-androideabi

# Set Android API levels
make android-debug ANDROID_API_LEVEL=34 ANDROID_MIN_API=24
```

### Build Configuration  
```bash
# Set build type (default: debug)
make android-build BUILD_TYPE=release

# Enable Rust logging
RUST_LOG=debug make android-debug
```

## 🚨 Prerequisites

### Required for All Development
- ✅ Rust toolchain (`rustup`, `cargo`)
- ✅ Node.js 18+ and pnpm
- ✅ Git

### Required for Android Development
- ✅ Android SDK and NDK
- ✅ Android Debug Bridge (adb)
- ✅ Environment variables: `ANDROID_HOME`, `ANDROID_NDK_HOME`

### Required for iOS Development (Future)
- ✅ Xcode and Xcode Command Line Tools
- ✅ iOS Simulator or physical device

## 🛡️ Environment Validation

The Makefile includes automatic environment checks:

```bash
# Checks Rust and Node.js installation
make check-rust check-node

# Checks Android development environment  
make check-android-env

# Checks iOS development environment
make check-ios-env
```

## 🐛 Troubleshooting

### Common Issues

1. **"Rust not found"**
   - Solution: Install Rust from https://rustup.rs/
   - Run: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

2. **"ANDROID_HOME not set"**
   - Solution: Install Android Studio or SDK command-line tools
   - Set environment variables in your shell profile

3. **"Android not set up"**
   - Solution: Run `make android-setup` first
   - This creates the necessary Android build structure

4. **Build failures**
   - Solution: Check prerequisites with `make platform-info`
   - Clean and rebuild: `make clean && make android-debug`

### Getting Help

```bash
# Show all available targets
make help

# Check current project status
make status  

# Show platform and tool versions
make platform-info
```

## 🏗️ Build Outputs

### Desktop
- **Debug**: `target/debug/codex-cli-desktop`
- **Release**: `target/release/codex-cli-desktop`
- **Bundle**: `target/release/bundle/macos/Codex CLI Desktop.app`

### Android
- **Debug APK**: `target/android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `target/android/app/build/outputs/apk/release/app-release.apk`
- **Release AAB**: `target/android/app/build/outputs/bundle/release/app-release.aab`

### iOS (Future)
- **Debug IPA**: `target/ios/build/Build/Products/Debug-iphoneos/`
- **Release IPA**: `target/ios/build/Build/Products/Release-iphoneos/`

## 🔄 Continuous Integration

The Makefile is designed for CI/CD usage:

```yaml
# Example GitHub Actions usage
- name: Setup and build Android
  run: |
    make setup
    make android-debug
    make android-test

- name: Build release
  env:
    RELEASE_KEY_PASSWORD: ${{ secrets.RELEASE_KEY_PASSWORD }}
    RELEASE_STORE_PASSWORD: ${{ secrets.RELEASE_STORE_PASSWORD }}
  run: make android-release
```