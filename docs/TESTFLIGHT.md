# First iPhone preview

The `testflight` EAS profile builds a signed iPhone/iPad App Store binary and auto-submits it to App Store Connect for TestFlight. It does not publish a public App Store release.

The current build configuration sets `EXPO_PUBLIC_CONTENT_MODE=website`: phones fetch public church content directly and retain a validated offline cache. A bundled snapshot supports first launch. Build 2 used snapshot-only mode; build 3 enables direct refresh. You can browse the app anywhere; YouTube, giving, registration, and directions still need internet. Bookmarks remain stored on the phone. Event reminders and calendar insertion use the phone's native services.

## Start

From this repository:

```sh
./scripts/testflight.sh
```

The script refreshes the content and runs checks before building. Sign into Expo in the browser when prompted. EAS then links the project and requests the Apple Developer account needed to create signing credentials. Keep passwords and two-factor codes inside those authentication prompts.

Use the Apple Developer team that should own `cc.fwcc.app`. If an App Store Connect record already exists for this app, supply its numeric Apple ID when EAS Submit requests it; otherwise the first-run submission flow sets up the record. Do not choose an unrelated existing app.

An Apple sandbox purchase-testing account is not the developer account needed to upload TestFlight binaries. The upload requires an enrolled Apple Developer account with appropriate App Store Connect access.

Once Apple processes the upload, select the build in App Store Connect → this app → TestFlight and make it available to your internal tester account. Install Apple's TestFlight app on the iPhone and accept the invitation for that account. External testers may require beta review.

## Previous snapshot-only build

**Uploaded successfully to Apple on September 8, 2026 at 4:47 PM Eastern.**

- App: Christ’s Church (`cc.fwcc.app`), App Store Connect ID `6809931734`.
- Version: **0.1.0 (2)**, iPhone/iPad App Store distribution.
- EAS build `0230eef7-7dda-4c85-a5f3-353188a09b3b` completed successfully.
- Apple Transporter 4.2.0 uploaded the signed IPA directly and reported “1 package was uploaded successfully” with exit code 0.
- Apple upload container: `9a22175a-8b0d-491a-aa66-21a6725fa7f6`.
- Both Expo submission jobs were canceled while queued to avoid duplicate uploads: `a72983ff-7711-49de-924c-fcbfff2ff404` and `0014db69-cb2d-4a7b-968e-c078a9938272`. Their canceled status does not mean the direct Apple upload failed.
- Local signed package: `.tools/releases/FWCC-0.1.0-2.ipa` (ignored by Git).
- The temporary local copy of the API private key was removed after upload. The existing EAS-managed key remains available for future submissions.

[Open TestFlight in App Store Connect](https://appstoreconnect.apple.com/apps/6809931734/testflight/ios)

Apple’s API confirms build 2 finished processing (`VALID`) and is available for internal testing (`IN_BETA_TESTING`). The build is assigned to the internal FWCC group. The account holder’s tester status is `INVITED`; accept the TestFlight email invitation on the iPhone to install it. The external testing status is `READY_FOR_BETA_SUBMISSION`, which does not block internal testing. Do not upload build 2 again; use a higher build number for a future binary.

References: [Expo iOS submission](https://docs.expo.dev/submit/ios/), [Apple internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/).


## Direct-refresh builds — September 9, 2026

- iOS 0.1.0 (3): EAS build `7a942063-bd11-475a-aa5b-52accf62834d` completed. Apple Transporter uploaded it successfully on September 9 at 1:44 PM Eastern; Apple confirmed `VALID` and `IN_BETA_TESTING`; build 3 is assigned to the FWCC internal group. TestFlight release notes describe direct refresh and offline testing. Local signed IPA: `.tools/releases/FWCC-0.1.0-3.ipa`.
- Android 0.1.0 (1), APK requested: [EAS build](https://expo.dev/accounts/oreo727/projects/fwcc/builds/1f0cf693-030e-461f-a122-deaf0d07f0b8) remains queued with no build worker/logs yet. Android signing credentials were generated and stored in EAS. The installable APK will be available on that build page after successful compilation.
- Validation: 11 content tests, 6 browser checks, TypeScript checks, all-platform bundle export, and live extraction of 100 messages / 8 events / 7 announcements passed.
- Phone acceptance: open Settings → Refresh church content while online; verify “Up to date” and the timestamp. Turn on airplane mode and refresh; saved text should remain with a refresh-unavailable status. Close and reopen offline to check persistence. Reconnect and refresh again. Check sermon playback, calendars, and reminders on each physical platform.
- Physical-device execution is still required; browser tests do not exercise native networking or OS permissions.


## Polished release — September 12, 2026

- iOS 0.1.0 (4): EAS build `62b315fb-cf99-4ae9-8894-c0b82d815ef9`.
- Simulator QA build: `47958790-4b54-499d-ba7c-218d7e45700a`.
- Includes both responsive UI passes, compact detail headings, refresh loading feedback, and scrollable notices.
- Refreshed snapshot: 100 messages, 8 events, 7 announcements. All 11 content tests, TypeScript checks, and 6 browser flows passed before building.
- External group `FWCC Friends`: `bc243f3c-fd71-4ce2-9fd0-657499d1161a`. Beta description and feedback email are configured. Apple review contact phone is required before review submission; no friend invitations have been sent.
- Physical iPhone acceptance: update in TestFlight; test Settings → Refresh church content, reopen in airplane mode, play a sermon, add/cancel a calendar entry, schedule/tap/clear a reminder, and inspect larger text settings. Simulator results are recorded separately from physical-device checks.


## Corrected release — build 5

Uploaded successfully with Apple Transporter on September 14 at 8:28 AM Eastern. Apple processing is pending; build 5 has not appeared in the TestFlight builds API yet.

- EAS build `47660887-89e4-410a-b37e-97d4e03d3289` finished successfully. Signed package: `.tools/releases/FWCC-0.1.0-5.ipa`.
- Fixes native modal safe-area handling: the details back button was underneath the iPhone status bar in build 4. Added a SafeAreaProvider inside the detail modal.
- Verified the corrected JavaScript in the existing native simulator shell: live refresh, settings dismissal, message search, and all five tabs passed `tests/native/smoke.yaml`. The simulator shell was locally re-bundled and signed for QA; it is not the App Store binary.
- Calendar/reminder acceptance is still incomplete: the event-specific native flow could not locate its target event. Actual streamed video, offline relaunch, and physical iPhone permissions still require verification.
- External review remains pending the review contact phone number. FWCC Friends exists; no external review submission or friend invitations have been sent.


## External beta review submitted

Build 0.1.0 (5), Apple build ID `267f9b93-cdeb-4f86-9cbd-cfc8dd257247`, was submitted for external TestFlight review after the user supplied the required contact phone. Apple returned `WAITING_FOR_REVIEW`. Review contact information is stored in App Store Connect.

FWCC Friends now contains build 5; build 4 was removed from that external group. Build 5 testing notes are configured. Internal testing remains available. External invitations/public link distribution must wait for approval; no friend invitations have been sent.


## Approved branding — build 6

- EAS build: `2caac3e9-38d6-45f3-9025-32393d4bbbbd`, version 0.1.0 (6).
- Replaces the placeholder cross in the header and app icon with the supplied `ccfw/CC Icon Black.ai` double-C artwork. The app icon is an opaque 1024 × 1024 RGB image; Android's foreground remains transparent.
- Icon generation, 11 content tests, TypeScript checks, and six browser flows passed. The updated header was visually inspected in the browser capture.
- This release is for the user's TestFlight validation. Public App Store publishing follows that validation.


Build 6 upload completed successfully on September 14 at 2:20 PM Eastern. Apple build ID `6410cb11-0788-46f4-877d-c8439475f046` is `VALID` and `IN_BETA_TESTING`. The approved branding build is available for internal validation. Public App Store submission has not been performed.


## Appearance modes — build 7

- EAS build: `a61a3b1a-c438-4360-8b1f-93ae845a5ba1`, version 0.1.0 (7).
- Adds Settings → Appearance with Light, Dark, and System options. The selected preference is saved after relaunch; System follows the phone appearance.
- Browser appearance regression coverage, root/mobile TypeScript checks, and iOS/Android/web production bundle exports passed before building.
- Apple Transporter uploaded `.tools/releases/FWCC-0.1.0-7.ipa` successfully on September 15, 2026 at 10:24 AM Eastern.
- Apple build ID `f4005abd-66c8-4349-ac5d-c09e5167736c` is `VALID` and `IN_BETA_TESTING`. The FWCC internal TestFlight group has this build.
- This release is for TestFlight validation of theme behavior and existing content flows. Public App Store submission has not been performed.


## Release candidate — version 1.1.0 build 8

- EAS build: `70ca8cd5-2f2b-4d7e-b5f2-88774f949491`, version 1.1.0 (8).
- Updates the public app version from 0.1.0 to 1.1.0 so the App Store candidate is easy to identify.
- Apple Transporter uploaded `.tools/releases/FWCC-1.1.0-8.ipa` successfully on September 15, 2026 at 2:53 PM Eastern.
- Apple build ID `9d36cb84-7eec-4281-822c-f094cec24104` is `VALID` and `IN_BETA_TESTING`. The FWCC internal TestFlight group has this build.
- TestFlight release notes are configured. This is the current candidate to select for App Store review.


## Next-level app candidate — build 9 attempt

Attempted on September 24, 2026 after adding the futuristic visual refresh, smarter Home/Sunday context, guided next steps, prayer access, series browsing, notification preferences, and a refreshed bundled content snapshot.

Preflight passed:

- Synced website content: 100 messages, 3 events, 6 announcements.
- Content tests passed: 11/11.
- Root and mobile TypeScript checks passed.

EAS incremented the remote iOS build number from 8 to 9 and confirmed remote iOS credentials and push notifications are configured. The build did not start because the Expo account has used its free iOS builds for the month. EAS reports the quota resets on October 1, 2026, or the account can be upgraded before retrying.


## Local Xcode build attempt — September 24, 2026

Created a no-EAS-cloud release path in `scripts/local-testflight.sh` and documented it in `docs/LOCAL_XCODE_RELEASE.md`.

Local status:

- `npx expo prebuild --platform ios --clean` succeeded.
- CocoaPods install succeeded.
- Xcode 26.6 detected the `ChristsChurch` workspace and scheme.
- Initial archiving was blocked by Apple signing because this Mac did not have an App Store provisioning profile for `cc.fwcc.app`.
- A fresh Apple 2FA code allowed Fastlane `sigh` to download and install the FWCC App Store profile: `428044cd-74a9-492c-8111-b7e5f649eba3`.
- That first profile belonged to the EAS-managed distribution certificate, so local signing rejected it. Fastlane `sigh --force` recreated a local-Xcode-compatible App Store profile: `d09ae2c2-8811-4721-9992-5a521fdcb8e6` (`cc.fwcc.app AppStore`).
- Local Xcode archive succeeded for version `1.1.0` build `9`.
- Local App Store IPA export succeeded: `.tools/local-xcode-build/FWCC-1.1.0-9-manual-newprofile/export/ChristsChurch.ipa`.
- Fastlane Pilot uploaded the IPA to App Store Connect successfully on September 24, 2026 at 2:20 PM Eastern, using an app-specific password supplied interactively by the account owner.

Next step: wait for Apple processing, then confirm build `1.1.0 (9)` appears in App Store Connect/TestFlight and assign it to the intended internal tester group.
