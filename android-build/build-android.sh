#!/bin/bash
set -e

BUILD_TYPE=${1:-debug}
TARGET=${2:-aarch64-linux-android}

echo "🏗️  Building Android app..."
echo "   Build type: $BUILD_TYPE"
echo "   Target: $TARGET"

# Check if Tauri CLI supports Android
if ! cargo tauri --help | grep -q "android"; then
    echo "❌ Tauri CLI doesn't support Android. Please install Tauri v2.0+ with Android support:"
    echo "   cargo install tauri-cli --git https://github.com/tauri-apps/tauri --branch=next"
    exit 1
fi

case $BUILD_TYPE in
    "debug")
        echo "🔧 Building debug APK..."
        cargo tauri android build --debug --target $TARGET
        ;;
    "release")
        echo "🚀 Building release APK..."
        if [ -z "$RELEASE_KEY_PASSWORD" ] || [ -z "$RELEASE_STORE_PASSWORD" ]; then
            echo "⚠️  Please set release keystore passwords:"
            echo "   export RELEASE_KEY_PASSWORD='your_key_password'"
            echo "   export RELEASE_STORE_PASSWORD='your_store_password'"
            exit 1
        fi
        cargo tauri android build --release --target $TARGET
        ;;
    *)
        echo "❌ Invalid build type. Use 'debug' or 'release'"
        exit 1
        ;;
esac

echo "✅ Android build completed!"
