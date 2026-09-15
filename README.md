# Christ’s Church mobile app

An Expo / React Native app for Apple iPhone and Samsung Android phones, with direct website content refresh and offline caching. A web preview uses the same screens through an optional content server. Signed testing builds are tracked in `docs/TESTFLIGHT.md`.

## Run locally

```sh
./scripts/dev.sh
```

The script starts the content server on port 8787 and Expo on port 8081. Press `w` for the browser preview or scan Expo’s QR code with a compatible Expo Go app on a phone on the same Wi-Fi. The script supplies your computer’s LAN address to the mobile content client. If it chooses the wrong network interface, set `EXPO_PUBLIC_CONTENT_URL` yourself before running it.

Node.js 22.13+ is required. On this workspace, a checksum-verified Node 22.23.2 binary was installed under `.tools/` because Node was not on the shell PATH. The script uses it automatically; it is not included in version control.

For separate terminals with Node on PATH:

```sh
npm ci
npm --prefix mobile ci
npm run server
# In another terminal:
EXPO_PUBLIC_CONTENT_URL=http://localhost:8787/v1/content npm --prefix mobile run web
```

`localhost` works for the browser on this computer; physical phones need the computer’s LAN IP. Production content endpoints must use HTTPS. Calendar and notification behavior requires native device testing; the browser exports an `.ics` calendar file and explains that phone reminders are unavailable there.

## What is implemented

- Home with church information, latest message, upcoming events, and website announcements.
- Searchable message library, on-demand YouTube player, external playback fallback, share, and persistent bookmarks.
- Events with Eastern time zone handling, featured filter, registration, share, calendar export, and opt-in local reminders.
- Visitor information, directions, connection card, ministry and serving links, phone and email actions.
- Giving through the church’s existing RebelGive destination.
- Settings for content refresh and clearing event reminders.
- Bundled public content for first launch, validated local cache, refresh on foreground/manual action and every 15 active minutes, and an honest freshness/offline indicator.
- Server polling, validation, source-host restrictions, cache persistence, atomic snapshot replacement, concurrent-refresh deduplication, health reporting, and ETags.

The app has no member accounts or payment database. It does not download videos for offline playback. Bookmarks refer to messages in the current 100-message library. Images and video still require their providers. Local event reminders use the time captured when scheduled; reschedule them if an event changes. Church-wide remote push notifications are a remaining release feature, separate from the implemented local reminders.

## Content and API integration

```sh
npm run sync
```

This refreshes `data/content.json` and the bundled snapshot in `mobile/src/content/bundled.json`. The running server refreshes its own cache every 15 minutes; the native app independently refreshes the website directly, so normal content updates require no rebuild.

Copy `.env.example` to `.env` to configure an optional server-side `CONTENT_API_URL` and `CONTENT_API_TOKEN`. The current API adapter expects the normalized contract in `mobile/src/content/schema.ts`. A provider-specific API gets its own normalization adapter. Credentials never belong in an `EXPO_PUBLIC_` variable.

Without a configured API, the server reads public fwcc.cc HTML, discovers Clover’s public media/calendar endpoints, extracts announcements and destination links, and normalizes the results. A failed or invalid API falls back to the website adapter. A failed website refresh retains the last validated snapshot. Native testing builds run the same website adapter directly on the phone, without a server. Web previews retain the server path to avoid browser CORS restrictions.

See [architecture](docs/ARCHITECTURE.md) for boundaries and operational details.

## Validation

```sh
npm run check
npm run test:browser
npm --prefix mobile run export
cd mobile && npx expo-doctor
```

Browser tests use a captured content fixture and a fixed date so scheduled events do not age out of assertions. The server and live scraper are checked separately. Playback tests verify the correct embedded destination, not actual streamed video playback. Giving tests intercept the destination and never submit payments or forms.

Screenshots are in `artifacts/`. Native iOS/Android export validates JavaScript bundles; it does not create an IPA or APK. Expo prebuild generates native projects, which are ignored and reproducible from app config.

## Device builds and release

`mobile/eas.json` includes preview APK, iOS simulator, and production profiles. Bundle identifiers are provisionally `cc.fwcc.app` and must be confirmed under church-owned accounts. The vector app icon is a draft church-themed mark, not an approved church logo.

Before creating distributable builds, connect the Expo project and configure an HTTPS `EXPO_PUBLIC_CONTENT_URL` in the build environment. A release still requires church-owned Apple/Google developer accounts, signing credentials, physical iPhone/Samsung testing, final branding and support/privacy URLs, store disclosures, and review of the hosted donation flow. See [release checklist](docs/RELEASE.md).
