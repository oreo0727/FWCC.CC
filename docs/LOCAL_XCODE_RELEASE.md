# Local Xcode release path

Use this path when you want to build the iOS App Store/TestFlight binary on this Mac instead of using Expo EAS Build.

This still uses the Expo React Native toolchain locally. It does not use Expo's cloud build quota.

## Requirements

- Xcode installed and opened at least once.
- Node.js 22.13 or newer.
- CocoaPods.
- An Apple Developer account in Xcode Settings -> Accounts with access to `cc.fwcc.app`.
- A valid Apple Distribution certificate.
- A valid App Store Connect provisioning profile for bundle ID `cc.fwcc.app`, or an App Store Connect API key supplied to `xcodebuild`.

## Command

```sh
BUILD_NUMBER=9 VERSION=1.1.0 ./scripts/local-testflight.sh
```

The script:

1. Syncs church content.
2. Runs content tests and TypeScript checks.
3. Generates or updates the local `mobile/ios` project.
4. Installs CocoaPods through Expo prebuild.
5. Archives with `xcodebuild`.
6. Exports an App Store IPA under `.tools/local-xcode-build/`.

Upload the exported IPA with Apple Transporter or Xcode Organizer.

## Current signing blocker

On September 24, 2026, local prebuild and CocoaPods install succeeded. The first local archive attempt could not complete because this Mac did not have an App Store provisioning profile for `cc.fwcc.app`.

Fastlane `sigh` then downloaded and installed the App Store provisioning profile:

- Initial UUID: `428044cd-74a9-492c-8111-b7e5f649eba3`
- Initial name: `*[expo] cc.fwcc.app AppStore 2026-09-08T19:53:04.036Z`
- App identifier: `CXFPR6N64M.cc.fwcc.app`
- Expiration: September 8, 2027
- Entitlements include production push notifications and beta reports.

That profile was tied to the EAS-managed distribution certificate. Recreating the profile with Fastlane `sigh --force` produced a local-Xcode-compatible profile:

- UUID: `d09ae2c2-8811-4721-9992-5a521fdcb8e6`
- Name: `cc.fwcc.app AppStore`
- App identifier: `CXFPR6N64M.cc.fwcc.app`
- Expiration: September 9, 2027

Using that profile, local Xcode archive and App Store IPA export succeeded for version `1.1.0` build `9`.

If provisioning expires or this setup moves to another Mac, do one of these:

- In Xcode, sign into the Apple Developer account, open `mobile/ios/ChristsChurch.xcworkspace`, select the `ChristsChurch` target, enable automatic signing for team `CXFPR6N64M`, and create/download an App Store Connect distribution profile for `cc.fwcc.app`.
- Or create an App Store Connect API key and run `xcodebuild` with `-authenticationKeyPath`, `-authenticationKeyID`, and `-authenticationKeyIssuerID`.
- Or manually download the App Store provisioning profile for `cc.fwcc.app` from Apple Developer and install it into `~/Library/MobileDevice/Provisioning Profiles/`.

After the profile is available, rerun:

```sh
BUILD_NUMBER=9 VERSION=1.1.0 ./scripts/local-testflight.sh
```
