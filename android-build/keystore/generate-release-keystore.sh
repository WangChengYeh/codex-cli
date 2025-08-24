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
