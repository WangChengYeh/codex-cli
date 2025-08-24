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
DEBUG_APK="../src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk"
RELEASE_APK="../src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk"

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
