# Release readiness

## Implemented and locally verifiable

- [x] Shared iPhone / Android app and browser preview.
- [x] Five primary screens and message/event details.
- [x] Live website ingestion with API fallback contract and disk cache.
- [x] Search, saved messages, sharing, hosted giving and forms.
- [x] Native calendar integration and local reminder implementation.
- [x] Offline text content and content freshness display.
- [x] Draft icons, platform identifiers, and EAS build profiles.
- [x] Parser/cache tests and browser interaction tests.

## Required before distributing to the congregation

- [ ] Confirm church ownership of the `cc.fwcc.app` identifiers, app name, and store accounts.
- [ ] Approve final brand assets; replace the draft cross icon if needed.
- [x] Direct website refresh on phones with validated offline cache; no content server required.
- [ ] Optional: deploy an HTTPS content server if a future API requires secret credentials.
- [x] Connect the Expo project; native builds use direct website refresh without a content server URL.
- [ ] Provision Apple signing and Android signing under church-owned accounts.
- [ ] Install and test actual binaries on an iPhone and a Samsung phone.
- [ ] Verify real YouTube playback, fullscreen, orientation, and external fallback.
- [ ] Verify native calendar insertion, cancellation, all-day events, and Eastern dates while the phone uses a different time zone.
- [ ] Verify notification denial, local reminders, repeated scheduling, tapping a reminder, and clearing reminders.
- [ ] Review VoiceOver/TalkBack, large text, small phone screens, and poor connectivity.
- [ ] Decide whether church-wide broadcast push is needed for launch; implement its authenticated publishing and delivery service if so.
- [ ] Publish a church-approved privacy policy and support page; complete store privacy forms based on actual providers and hosting logs.
- [ ] Review current donation rules against the exact RebelGive flow and church nonprofit status.
- [ ] Confirm event ownership and service/contact details; some website announcements are absent from the structured calendar.
- [ ] Review dependency audit findings: the installed Expo toolchain currently inherits moderate uuid advisories through xcode. Do not apply npm’s suggested downgrade to Expo 46; adopt a compatible upstream fix when available.
- [ ] Prepare screenshots and store descriptions; submit and complete store review.

As of September 12, this computer has full Xcode and an iOS 26.5 simulator runtime. No physical iPhone is connected. Signed release builds are produced through EAS and uploaded with Apple Transporter. Browser tests simulate phone widths; native simulator tests live in `tests/native/`. Neither substitutes for physical-device playback, offline, calendar, and reminder acceptance checks.
