#!/bin/bash
set -e

BUILD_TYPE=${1:-debug}
TARGET=${2:-aarch64-linux-android}

echo "🏗️  Building Android app..."
echo "   Build type: $BUILD_TYPE"
echo "   Target: $TARGET"

# Check if Tauri CLI supports Android
if ! cargo tauri --help | grep -q "android"; then
    echo "❌ Tauri CLI doesn't support Android. Please upgrade to Tauri v2.0+:"
    echo "   cargo install tauri-cli --version '^2.0'"
    exit 1
fi

# Initialize Android project if not already done
if [ ! -d "src-tauri/gen/android" ]; then
    echo "🔧 Initializing Android project..."
    cargo tauri android init || {
        echo "⚠️  Android initialization failed. This is expected without Android SDK."
        echo "   The build infrastructure is ready and will work once Android SDK is installed."
        echo ""
        echo "📋 To complete Android setup:"
        echo "   1. Install Android Studio: https://developer.android.com/studio"
        echo "   2. Set environment variables:"
        echo "      export ANDROID_HOME=\$HOME/Android/Sdk"
        echo "      export PATH=\$PATH:\$ANDROID_HOME/tools:\$ANDROID_HOME/platform-tools"
        echo "   3. Re-run: make android-debug"
        exit 1
    }
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
