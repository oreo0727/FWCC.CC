# FWCC mobile app — initial plan

Updated: September 8, 2026. Implementation is underway; see README.md for the current build and docs/RELEASE.md for remaining release requirements.

## Product direction

Build a Christ's Church app that helps people participate throughout the week: watch messages, discover events, take a next step, and give. Make visitor information easy to find. Confirmed platforms are Apple iPhone and Samsung Android, with one shared application. Audience priority remains open for user input; the scope below provisionally emphasizes weekly church use.

## What we verified

- The [website](https://fwcc.cc/) identifies Christ's Church in Fort Wayne, provides service information and ministry pages, presents a message player, and credits Clover as its website platform.
- The [connection card](https://ccfortwayne.churchcenter.com/people/forms/123903) uses Church Center.
- [Get Connected](https://fwcc.cc/get-connected) links to Ministry Forms for groups and serving.
- [Give Online](https://fwcc.cc/give-online) links to RebelGive.
- The public [events page](https://fwcc.cc/coming-up) does not expose event records in the retrieved text. The underlying calendar and media providers still need inspection.
- The workspace now contains the Expo app, content server, tests, and build configuration. Private administrative access, API credentials, and any existing mobile app arrangements remain unverified.

## Proposed first release

| Area          | First-release behavior                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home          | Current announcement, latest message, next events, service information, and a prominent visitor shortcut.                                                           |
| Messages      | Message list and detail screens; playback through the verified media provider; sharing and locally saved favorites. Live service link if a supported source exists. |
| Events        | Upcoming events and details, registration through existing forms, native calendar export, and sharing.                                                              |
| Connect       | Plan a visit, directions, contact details, ministry information, connection card, groups, serving, and baptism links.                                               |
| Give          | Open the existing hosted giving flow in the system browser. Validate the exact flow against current store requirements before release.                              |
| Notifications | Optional church-wide announcements with links to relevant app screens and an accessible setting to manage notifications.                                            |

Proposed bottom navigation: Home, Messages, Events, Connect, Give. No account is required for public content. Provider-hosted forms and giving may use their own authentication.

Defer member profiles, chat, a public prayer wall, custom giving, child check-in, volunteer scheduling, downloaded media, and cross-device synchronization. These require separate requirements and verified provider support.

## Design direction

Use the church's approved logo, colors, photography, and welcoming voice. Start with a small set of reusable components and five primary screens. Prioritize readable text, large touch targets, screen-reader labels, dynamic text sizes, and clear loading, empty, offline, and error states. Confirm branding assets before detailed visual design.

## Technical approach

Use React Native with Expo and TypeScript as the provisional stack. [Expo](https://docs.expo.dev/) supports a shared project for iOS and Android and provides build and submission tooling. Confirm fit after testing the media and form integrations.

Keep integrations behind a small content service so the app consumes consistent records for messages, events, announcements, ministries, and church information. Use stable identifiers, publication dates, event time zones, image URLs, and destination links. Keep provider credentials on the server.

Preferred content approach: supported feeds or APIs from existing church systems. If those are unavailable, choose a small staff-managed CMS for app content and explicitly document any duplicate publishing work before implementation. Per the user’s direction, implement server-side HTML scraping and public widget-feed extraction when supported APIs are unavailable, with validation and last-known-good caching.

Use local storage for favorites and cached public content. Add only the backend needed for content delivery, staff-controlled notification publishing, and device token management. Choose the hosting/CMS provider after the integration audit; do not introduce a member database for this release.

## Delivery sequence

1. **Confirm scope and integrations.** Identify the primary audience, platform preference, content owner, media source, calendar source, available feeds/APIs, approved branding, and church-owned developer accounts. Deliver an integration matrix with a tested approach or fallback for every feature.
2. **Create a clickable prototype.** Design the five primary screens and message/event detail screens using representative church content. Review visitor and regular-attendee journeys. Deliver a concrete prototype before production development.
3. **Build the content foundation.** Create the Expo project, navigation, shared components, content models, integration adapters, caching, and error states. Demonstrate that a staff content update appears without rebuilding the app.
4. **Complete the first-release features.** Connect messages, events, forms, giving, calendar export, favorites, sharing, and notification delivery. Validate the real provider flows on both platforms.
5. **Pilot with church staff and attendees.** Distribute iOS and Android test builds, test accessibility and weak-network behavior, gather feedback, and fix launch-blocking issues.
6. **Prepare and release.** Finalize the app name, icon, screenshots, support contact, privacy policy, store disclosures, and content ownership. Submit under church-owned accounts and prepare a website/QR-code launch announcement for staff to publish.

Do not commit to a launch date until integrations and scope are confirmed. Budget should cover implementation, developer accounts, hosting/CMS, notification infrastructure if applicable, and ongoing maintenance; verify current provider costs when services are selected.

## Acceptance criteria

- People can browse public content without creating an account.
- Staff can publish messages, events, and announcements through the agreed workflow without an app release.
- A real message plays successfully on physical iPhone and Android devices.
- Event dates display correctly, calendar exports preserve time zones, and registration reaches the correct hosted form.
- Giving opens the verified provider destination; payment information stays with the provider.
- Favorites persist after restarting the app; cached public content remains readable offline with a clear freshness indication.
- Notifications require opt-in, open the intended screen, and can be disabled.
- Key journeys work with screen readers and enlarged text; unavailable content produces useful recovery actions.
- Staff has a documented process for publishing content, sending notifications, addressing broken links, and maintaining the app.
- Store submission requirements are reviewed at release time, including [Apple's minimum-functionality and donation rules](https://developer.apple.com/app-store/review/guidelines/). Store approval remains an external dependency.

## Decisions to resolve

- First-release priority: weekly church use, visitors, or member tools?
- Both iPhone and Android, or one platform first?
- Independently branded store app, and does the church already have an app arrangement through an existing provider?
- Who maintains website content, and what supported integration access is available?
- What are the target date, budget range, and ongoing content/maintenance owners?

Immediate next deliverable: confirm the first-release priority and produce the integration matrix plus screen wireframes.
