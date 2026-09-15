import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  discover,
  parseEvents,
  parseMessages,
  parsePages,
  safeUrl,
  scrapeWebsite,
  fetchPublic,
} from "../server/scraper.ts";
import { createContentStore } from "../server/store.ts";
import { contentSchema } from "../mobile/src/content/schema.ts";

const snapshot = contentSchema.parse(
  JSON.parse(await readFile("mobile/src/content/bundled.json", "utf8")),
);
const event = {
  id: "event-1",
  name: "Welcome Lunch",
  starting_at: "2026-09-13T12:45:00",
  ending_at: "2026-09-13T14:00:00",
  status: "active",
  timezone: "America/New_York",
  url: "http://fwcc.cc/events/welcome",
  description: "<p>Join <b>us</b>.</p>",
  custom_url: "https://forms.ministryforms.net/welcome",
};
test("church event times retain Eastern offsets across daylight saving time", () => {
  const parsed = parseEvents(
    [
      event,
      {
        ...event,
        id: "winter",
        starting_at: "2026-11-08T12:45:00",
        ending_at: "2026-11-08T14:00:00",
      },
    ],
    new Date("2026-09-01"),
  );
  assert.equal(parsed[0].start, "2026-09-13T12:45:00.000-04:00");
  assert.equal(parsed[1].start, "2026-11-08T12:45:00.000-05:00");
  assert.equal(parsed[0].url, "https://fwcc.cc/events/welcome");
  assert.equal(parsed[0].description, "Join us.");
});
test("canceled and completed events do not show as upcoming", () => {
  assert.equal(
    parseEvents(
      [
        { ...event, canceled_at: "2026-09-01" },
        {
          ...event,
          id: "old",
          starting_at: "2025-01-01T09:00:00",
          ending_at: "2025-01-01T10:00:00",
        },
      ],
      new Date("2026-09-01"),
    ).length,
    0,
  );
});
test("invalid times and unsafe content URLs fail validation", () => {
  assert.throws(() => parseEvents([{ ...event, ending_at: "invalid" }]));
  assert.throws(() =>
    parseEvents([{ ...event, ending_at: event.starting_at }]),
  );
  assert.equal(safeUrl("javascript:alert(1)"), undefined);
  assert.equal(safeUrl("https://user:password@fwcc.cc"), undefined);
  assert.equal(safeUrl("/im-new"), "https://fwcc.cc/im-new");
});
test("newest message is chosen by date, not provider ordering", () => {
  const media = [
    {
      id: 1,
      title: "First",
      date: "2026-08-23",
      upload_type: "youtube",
      third_party_id: "I-ewaRwj-6Y",
    },
    {
      id: 2,
      title: "Latest",
      date: "2026-08-30",
      upload_type: "youtube",
      third_party_id: "AKpB9FAfysA",
    },
  ];
  assert.equal(parseMessages({ media })[0].title, "Latest");
  assert.throws(() => parseMessages({ items: media }));
});
test("embedded website configuration is validated, never executed", () => {
  const html = `<script data-component-name="MediaWidget">{"id":"player-1","base_domain":"cloversites.com"}</script><div data-events-settings='{"calendars_url":"https://almanac.cloversites.com/v1/calendars/church"}'></div>`;
  assert.equal(
    discover(html).mediaUrl,
    "https://mediaplayer.cloversites.com/players/player-1?draft=0",
  );
  assert.throws(() =>
    discover(html.replace("almanac.cloversites.com", "localhost")),
  );
  assert.throws(() => discover("<html>New site layout</html>"));
});
test("HTML fallback extracts announcements and rejects disguised provider links", () => {
  const html = `<article class="text" id="welcome"><header class="title-text"><p>Welcome lunch</p></header><p>Join our church family for lunch and conversation this Sunday.</p></article><a href="https://evil.example/?ministryforms">Fake</a><a href="https://ccfortwayne.churchcenter.com/people/forms/123903">Connect</a>`;
  const result = parsePages(
    html,
    "",
    '<a href="https://givingflow.rebelgive.com/test">Give</a>',
  );
  assert.equal(result.links.length, 1);
  assert.equal(result.announcements[0].title, "Welcome lunch");
});
test("failed refresh retains valid disk snapshot and marks it stale", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fwcc-test-"));
  try {
    let fail = false;
    const store = createContentStore(join(dir, "content.json"), async () => {
      if (fail) throw new Error("upstream unavailable");
      return snapshot;
    });
    await store.refresh();
    fail = true;
    await store.refresh();
    assert.deepEqual(store.current, snapshot);
    assert.equal(store.stale, true);
    const recovered = createContentStore(join(dir, "content.json"));
    await recovered.load();
    assert.deepEqual(recovered.current, snapshot);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("simultaneous refreshes share one upstream request", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fwcc-test-"));
  let calls = 0;
  try {
    const store = createContentStore(join(dir, "content.json"), async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return snapshot;
    });
    await Promise.all([store.refresh(), store.refresh(), store.refresh()]);
    assert.equal(calls, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

const websiteHome = `<script data-component-name="MediaWidget">{"id":"player-1","base_domain":"cloversites.com"}</script><div data-events-settings='{"calendars_url":"https://almanac.cloversites.com/v1/calendars/church"}'></div><article class="text" id="welcome"><h2>Welcome lunch</h2><p>Join our church family for lunch and conversation this Sunday.</p></article><a href="/im-new">Visit</a>`;
const websiteMedia = JSON.stringify({
  media: [{ id: 1, title: "Fresh message", date: "2026-09-09" }],
});
function websiteReader(url: string): Promise<string> {
  if (url === "https://fwcc.cc/") return Promise.resolve(websiteHome);
  if (url.includes("/players/")) return Promise.resolve(websiteMedia);
  if (url.includes("/events?")) return Promise.resolve(JSON.stringify([event]));
  if (url.endsWith("/get-connected")) return Promise.resolve("");
  if (url.endsWith("/give-online"))
    return Promise.resolve(
      '<a href="https://givingflow.rebelgive.com/test">Give</a>',
    );
  throw new Error(`Unexpected request: ${url}`);
}
test("phone extraction discovers feeds and publishes a complete fresh snapshot", async () => {
  const content = await scrapeWebsite(
    new Date("2026-09-09T12:00:00Z"),
    websiteReader,
  );
  assert.equal(content.messages[0].title, "Fresh message");
  assert.equal(content.events[0].start, "2026-09-13T12:45:00.000-04:00");
  assert.equal(content.announcements[0].title, "Welcome lunch");
  assert.equal(content.fetchedAt, "2026-09-09T12:00:00.000Z");
  assert.equal(content.source, "website");
});
test("phone extraction rejects partial source failures and malformed feeds", async () => {
  for (const broken of ["network", "schema"]) {
    await assert.rejects(
      scrapeWebsite(new Date("2026-09-09"), async (url) => {
        if (url.includes("/events?")) {
          if (broken === "network") throw new Error("Network unavailable");
          return '{"error":"feed changed"}';
        }
        return websiteReader(url);
      }),
    );
  }
});
test("phone transport refuses unapproved hosts and insecure requests", async () => {
  await assert.rejects(fetchPublic("https://example.com/feed"), /Unapproved/);
  await assert.rejects(fetchPublic("http://fwcc.cc/"), /Unapproved/);
});
