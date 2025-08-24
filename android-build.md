# Android Build Configuration Guide

## Prerequisites

### 1. Install Android SDK and NDK
```bash
# Install Android Studio or command line tools
# Download from: https://developer.android.com/studio

# Set environment variables
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/25.1.8937393
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### 2. Install Rust Android Targets
```bash
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add i686-linux-android
rustup target add x86_64-linux-android
```

### 3. Install Tauri Android Dependencies
```bash
# Install Tauri CLI with Android support (v2.0+)
cargo install tauri-cli --git https://github.com/tauri-apps/tauri --branch=next

# Or use pre-release version
cargo install tauri-cli --version="2.0.0-rc"
```

## Android Project Configuration

### 1. Initialize Android Project
```bash
# Initialize Android project structure
tauri android init

# This creates:
# - src-tauri/gen/android/
# - Android manifest and configuration files
# - Gradle build scripts
```

### 2. Android Manifest Configuration
The Android manifest should include:

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<application
    android:label="Codex CLI"
    android:theme="@android:style/Theme.DeviceDefault.NoActionBar"
    android:hardwareAccelerated="true"
    android:usesCleartextTraffic="true">
    
    <activity
        android:name=".MainActivity"
        android:exported="true"
        android:launchMode="singleTop"
        android:theme="@android:style/Theme.DeviceDefault.NoActionBar">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
    </activity>
</application>
```

### 3. Build Configuration
Create `src-tauri/android-build.gradle`:

```gradle
android {
    compileSdkVersion 34
    defaultConfig {
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1
        versionName "0.1.0"
        applicationId "com.codexcli.desktop"
    }
    
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}
```

## Signing Configuration

### 1. Generate Signing Key
```bash
# Generate debug keystore for development
keytool -genkey -v -keystore debug.keystore -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000

# For production, generate release keystore
keytool -genkey -v -keystore release.keystore -alias codex-cli -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Configure Signing in build.gradle
```gradle
android {
    signingConfigs {
        debug {
            keyAlias 'androiddebugkey'
            keyPassword 'android'
            storeFile file('debug.keystore')
            storePassword 'android'
        }
        release {
            keyAlias 'codex-cli'
            keyPassword System.getenv("RELEASE_KEY_PASSWORD")
            storeFile file('release.keystore')
            storePassword System.getenv("RELEASE_STORE_PASSWORD")
        }
    }
    
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

## Build Commands

### Development Build
```bash
# Build debug APK
tauri android build --debug

# Build and install on connected device
tauri android build --debug --target aarch64-linux-android
adb install target/android/app/build/outputs/apk/debug/app-debug.apk
```

### Production Build
```bash
# Build release APK
tauri android build --release --target aarch64-linux-android

# Build AAB for Play Store
tauri android build --release --target aarch64-linux-android --format aab
```

## Device Testing

### 1. Connect Device
```bash
# Enable USB debugging on Android device
# Connect via USB

# Verify device connection
adb devices

# Expected output:
# List of devices attached
# DEVICE_ID    device
```

### 2. Install and Test
```bash
# Install APK
adb install -r target/android/app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am start -n com.codexcli.desktop/.MainActivity

# View logs
adb logcat | grep -i "codex\|tauri"
```

### 3. Test Scenarios
1. **App Launch**: Verify app starts without crashes
2. **Platform Detection**: Check platform shows "Android" in header
3. **Command Execution**: Test allowed commands (pwd, ls, echo)
4. **Command Restrictions**: Verify restricted commands are blocked
5. **Mobile UI**: Test tab navigation and touch interactions
6. **File Operations**: Test reading/writing within app sandbox
7. **Plan Management**: Test plan creation and updates
8. **Session Management**: Test session start/stop functionality

### 4. Performance Testing
```bash
# Monitor CPU and memory usage
adb shell top | grep com.codexcli.desktop

# Check app permissions
adb shell dumpsys package com.codexcli.desktop | grep permission
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Ensure Android SDK and NDK are properly installed
   - Check Rust targets are added for Android
   - Verify environment variables are set

2. **Permission Errors**
   - Check AndroidManifest.xml permissions
   - Test on different Android API levels
   - Verify file access permissions

3. **Command Execution Issues**
   - Check platform allowlist in platform.rs
   - Test command paths on Android
   - Verify subprocess execution works in Android sandbox

4. **UI Issues**
   - Test on different screen sizes
   - Check touch target sizes (minimum 44px)
   - Verify responsive breakpoints work

## Deployment

### Play Store Preparation
```bash
# Build signed AAB
export RELEASE_KEY_PASSWORD="your_key_password"
export RELEASE_STORE_PASSWORD="your_store_password"

tauri android build --release --target aarch64-linux-android --format aab

# Upload target/android/app/build/outputs/bundle/release/app-release.aab to Play Console
```

### Direct Distribution
```bash
# Build signed APK
tauri android build --release --target aarch64-linux-android

# APK location: target/android/app/build/outputs/apk/release/app-release.apk
```