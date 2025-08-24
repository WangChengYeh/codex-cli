#!/bin/bash
set -e

echo "🔧 Setting up Android build environment..."

# Check prerequisites
check_prerequisite() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 not found. Please install $1 first."
        exit 1
    fi
}

echo "📋 Checking prerequisites..."
check_prerequisite "rustup"
check_prerequisite "cargo"

# Add Android Rust targets
echo "🎯 Adding Android Rust targets..."
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add i686-linux-android
rustup target add x86_64-linux-android

# Check Android SDK
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  ANDROID_HOME not set. Please install Android SDK and set environment variables:"
    echo "   export ANDROID_HOME=\$HOME/Android/Sdk"
    echo "   export PATH=\$PATH:\$ANDROID_HOME/tools:\$ANDROID_HOME/platform-tools"
    echo ""
    echo "Download Android SDK from: https://developer.android.com/studio"
else
    echo "✅ Android SDK found at: $ANDROID_HOME"
fi

# Check NDK
if [ -z "$ANDROID_NDK_HOME" ]; then
    echo "⚠️  ANDROID_NDK_HOME not set. Please install Android NDK:"
    echo "   export ANDROID_NDK_HOME=\$ANDROID_HOME/ndk/25.1.8937393"
else
    echo "✅ Android NDK found at: $ANDROID_NDK_HOME"
fi

# Create Android build directories
echo "📁 Creating Android build structure..."
mkdir -p android-build/{keystore,config,apk}

# Generate debug keystore if it doesn't exist
DEBUG_KEYSTORE="android-build/keystore/debug.keystore"
if [ ! -f "$DEBUG_KEYSTORE" ]; then
    echo "🔐 Generating debug keystore..."
    keytool -genkey -v \
        -keystore "$DEBUG_KEYSTORE" \
        -alias androiddebugkey \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -keypass android \
        -storepass android \
        -dname "CN=Android Debug,O=Android,C=US"
    echo "✅ Debug keystore created at: $DEBUG_KEYSTORE"
else
    echo "✅ Debug keystore already exists"
fi

# Create release keystore template script
cat > android-build/keystore/generate-release-keystore.sh << 'EOF'
#!/bin/bash
# Generate release keystore for production builds
# Usage: ./generate-release-keystore.sh

echo "🔐 Generating release keystore..."
read -p "Enter your name: " name
read -p "Enter your organization: " org
read -p "Enter your country code (US, CN, etc.): " country
read -s -p "Enter keystore password: " store_pass
echo
read -s -p "Enter key password: " key_pass
echo

keytool -genkey -v \
    -keystore release.keystore \
    -alias codex-cli-release \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -keypass "$key_pass" \
    -storepass "$store_pass" \
    -dname "CN=$name,O=$org,C=$country"

echo "✅ Release keystore created!"
echo "⚠️  Keep your passwords safe - you'll need them for production builds"
EOF

chmod +x android-build/keystore/generate-release-keystore.sh

# Create Android configuration template
cat > android-build/config/android-config.json << 'EOF'
{
  "package_name": "com.codexcli.desktop",
  "app_name": "Codex CLI",
  "version_code": 1,
  "version_name": "0.1.0",
  "min_sdk_version": 24,
  "target_sdk_version": 34,
  "compile_sdk_version": 34,
  "permissions": [
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE"
  ],
  "features": [
    {
      "name": "android.hardware.touchscreen",
      "required": true
    },
    {
      "name": "android.software.webview",
      "required": true
    }
  ]
}
EOF

# Create build script
cat > android-build/build-android.sh << 'EOF'
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
EOF

chmod +x android-build/build-android.sh

# Create device testing script
cat > android-build/test-device.sh << 'EOF'
#!/bin/bash
set -e

echo "📱 Android Device Testing Script"

# Check if device is connected
if ! command -v adb &> /dev/null; then
    echo "❌ ADB not found. Please install Android SDK platform-tools"
    exit 1
fi

echo "🔍 Checking connected devices..."
DEVICES=$(adb devices | grep -v "List of devices" | grep "device$" | wc -l | tr -d ' ')

if [ "$DEVICES" -eq 0 ]; then
    echo "❌ No Android devices connected"
    echo "   1. Enable USB Debugging on your device"
    echo "   2. Connect via USB"
    echo "   3. Accept USB debugging prompt on device"
    exit 1
fi

echo "✅ Found $DEVICES connected device(s)"
adb devices

# Find APK file
DEBUG_APK="target/android/app/build/outputs/apk/debug/app-debug.apk"
RELEASE_APK="target/android/app/build/outputs/apk/release/app-release.apk"

APK_FILE=""
if [ -f "$DEBUG_APK" ]; then
    APK_FILE="$DEBUG_APK"
    echo "📦 Found debug APK: $APK_FILE"
elif [ -f "$RELEASE_APK" ]; then
    APK_FILE="$RELEASE_APK"
    echo "📦 Found release APK: $APK_FILE"
else
    echo "❌ No APK found. Please build first:"
    echo "   ./android-build/build-android.sh debug"
    exit 1
fi

# Install APK
echo "📲 Installing APK on device..."
adb install -r "$APK_FILE"

# Launch app
echo "🚀 Launching Codex CLI app..."
adb shell am start -n com.codexcli.desktop/.MainActivity

echo "✅ App launched! Check your device."

# Show testing instructions
echo ""
echo "📋 Manual Testing Checklist:"
echo "   ✅ App starts without crashes"
echo "   ✅ Platform shows 'Android' in header"
echo "   ✅ Tab navigation works (Terminal/Plan/Session/Status)"
echo "   ✅ Touch interactions are responsive"
echo "   ✅ Commands work: pwd, ls, echo"
echo "   ✅ Restricted commands show error messages"
echo "   ✅ File operations work within app sandbox"
echo "   ✅ Plan management functions properly"
echo ""

# Monitor logs
read -p "Press Enter to view app logs (Ctrl+C to exit)..."
echo "📊 Monitoring app logs..."
adb logcat | grep -i "codex\|tauri\|rust\|webview"
EOF

chmod +x android-build/test-device.sh

echo ""
echo "✅ Android build environment setup complete!"
echo ""
echo "📁 Created structure:"
echo "   android-build/"
echo "   ├── keystore/debug.keystore (debug signing)"
echo "   ├── keystore/generate-release-keystore.sh (release setup)"
echo "   ├── config/android-config.json (app configuration)"
echo "   ├── build-android.sh (build script)"
echo "   └── test-device.sh (device testing)"
echo ""
echo "🚀 Next steps:"
echo "   1. Install Android SDK if not already installed"
echo "   2. Run: source sourceme && ./android-build/build-android.sh debug"
echo "   3. Connect Android device and run: ./android-build/test-device.sh"
echo ""