#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  export PATH="$PWD/.tools/node-v22.23.2-darwin-arm64/bin:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Install Node.js 22.13 or newer, then retry." >&2
  exit 1
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "Install CocoaPods, then retry." >&2
  exit 1
fi

BUILD_NUMBER="${BUILD_NUMBER:-10}"
VERSION="${VERSION:-1.1.0}"
TEAM_ID="${TEAM_ID:-CXFPR6N64M}"
CONFIGURATION="${CONFIGURATION:-Release}"
SCHEME="${SCHEME:-ChristsChurch}"
EXPORT_METHOD="${EXPORT_METHOD:-app-store-connect}"
PROFILE_NAME="${PROFILE_NAME:-cc.fwcc.app AppStore}"
PROFILE_UUID="${PROFILE_UUID:-d09ae2c2-8811-4721-9992-5a521fdcb8e6}"
SIGNING_CERTIFICATE="${SIGNING_CERTIFICATE:-Apple Distribution}"
EXPORT_DIR="$PWD/.tools/local-xcode-build/FWCC-$VERSION-$BUILD_NUMBER"
ARCHIVE_PATH="$EXPORT_DIR/$SCHEME.xcarchive"
EXPORT_OPTIONS="$EXPORT_DIR/ExportOptions.plist"

npm run sync
npm run check

cd mobile
npx expo prebuild --platform ios
cd ..

mkdir -p "$EXPORT_DIR"

cat > "$EXPORT_OPTIONS" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>$EXPORT_METHOD</string>
  <key>teamID</key>
  <string>$TEAM_ID</string>
  <key>signingStyle</key>
  <string>manual</string>
  <key>signingCertificate</key>
  <string>$SIGNING_CERTIFICATE</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>cc.fwcc.app</key>
    <string>$PROFILE_NAME</string>
  </dict>
  <key>stripSwiftSymbols</key>
  <true/>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
PLIST

xcodebuild archive \
  -workspace mobile/ios/ChristsChurch.xcworkspace \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  MARKETING_VERSION="$VERSION" \
  CODE_SIGN_STYLE=Manual \
  CODE_SIGN_IDENTITY="$SIGNING_CERTIFICATE" \
  PROVISIONING_PROFILE_SPECIFIER="$PROFILE_NAME" \
  PROVISIONING_PROFILE="$PROFILE_UUID"

xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -allowProvisioningUpdates

echo "Local App Store IPA exported to $EXPORT_DIR"
echo "Upload with Apple Transporter, Xcode Organizer, or:"
echo "FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD=... fastlane pilot upload --ipa \"$EXPORT_DIR/ChristsChurch.ipa\" --username jbaugh10@gmail.com --app_identifier cc.fwcc.app --team_id $TEAM_ID --skip_waiting_for_build_processing true"
