import * as cheerio from "cheerio/slim";
import { DateTime } from "luxon";
import {
  contentSchema,
  eventSchema,
  messageSchema,
  type Content,
} from "./schema";

const SITE = "https://fwcc.cc";
const ALLOWED = new Set([
  "fwcc.cc",
  "mediaplayer.cloversites.com",
  "almanac.cloversites.com",
]);
export function safeUrl(value: unknown, base = SITE): string | undefined {
  if (typeof value !== "string" || !value.trim()) return;
  try {
    const u = new URL(value, base);
    if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
      return;
    u.protocol = "https:";
    return u.href;
  } catch {
    return;
  }
}
export function plain(value: unknown): string {
  if (typeof value !== "string") return "";
  const $ = cheerio.load(value);
  $("script,style").remove();
  $("br").replaceWith("\n");
  $("p").append("\n\n");
  return $.root()
    .text()
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}
export async function fetchPublic(url: string): Promise<string> {
  if (!ALLOWED.has(new URL(url).hostname) || !url.startsWith("https://"))
    throw new Error("Unapproved content host");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "error",
    });
    // Some native fetch implementations follow redirects despite redirect:error.
    if (response.url && !ALLOWED.has(new URL(response.url).hostname))
      throw new Error("Unapproved redirected content host");
    if (!response.ok) throw new Error(`Source returned ${response.status}`);
    const body = await response.text();
    if (body.length > 5_000_000)
      throw new Error("Source is unexpectedly large");
    return body;
  } finally {
    clearTimeout(timer);
  }
}
export function discover(html: string) {
  const $ = cheerio.load(html);
  const widget = JSON.parse(
    $('script[data-component-name="MediaWidget"]').first().text() || "{}",
  );
  const calendar = JSON.parse(
    $("[data-events-settings]").first().attr("data-events-settings") || "{}",
  );
  if (
    !/^[\w-]+$/.test(widget.id ?? "") ||
    widget.base_domain !== "cloversites.com"
  )
    throw new Error("Media widget structure changed");
  const calendarUrl = safeUrl(calendar.calendars_url);
  if (
    !calendarUrl ||
    new URL(calendarUrl).hostname !== "almanac.cloversites.com"
  )
    throw new Error("Calendar structure changed");
  return {
    mediaUrl: `https://mediaplayer.cloversites.com/players/${widget.id}?draft=0`,
    calendarUrl,
  };
}
export function parseMessages(raw: unknown) {
  const items = (raw as { media?: unknown[] })?.media;
  if (!Array.isArray(items) || !items.length)
    throw new Error("Message feed missing");
  const messages = items.map((item: any) => {
    const youtubeId =
      item.upload_type === "youtube" && /^[\w-]{11}$/.test(item.third_party_id)
        ? item.third_party_id
        : undefined;
    return messageSchema.parse({
      id: String(item.id),
      title: plain(item.title),
      description: plain(item.description),
      date: item.date?.slice(0, 10),
      speaker: plain(item.speaker),
      series: plain(item.series),
      image: safeUrl(item.thumbnails?.large),
      youtubeId,
      url: youtubeId
        ? `https://www.youtube.com/watch?v=${youtubeId}`
        : `${SITE}/media/1234521-5033601-${item.id}`,
    });
  });
  return messages.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100);
}
export function parseEvents(raw: unknown, now = new Date()) {
  if (!Array.isArray(raw)) throw new Error("Event feed changed");
  return raw
    .filter((e: any) => !e.canceled_at && e.status === "active")
    .map((e: any) => {
      const timezone = e.timezone || "America/New_York";
      const start = DateTime.fromISO(e.starting_at, { zone: timezone });
      const end = DateTime.fromISO(e.ending_at, { zone: timezone });
      return eventSchema.parse({
        id: String(e.id),
        title: plain(e.name),
        description: plain(e.description),
        start: start.toISO(),
        end: end.toISO(),
        timezone,
        allDay: Boolean(e.all_day),
        location: e.room
          ? `${e.room} · 3131 Maplecrest Rd`
          : "3131 Maplecrest Rd, Fort Wayne, IN",
        featured: Boolean(e.featured),
        url: safeUrl(e.url),
        registrationUrl: safeUrl(e.custom_url),
      });
    })
    .filter((e) => Date.parse(e.end) >= now.getTime())
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
export function parsePages(home: string, connect: string, giving: string) {
  const $ = cheerio.load(home);
  const announcements: Content["announcements"] = [];
  $("article.text").each((_, el) => {
    const section = $(el);
    const heading = section.find("header.title-text,h1,h2,h3").first();
    const title = plain(heading.html());
    if (!title || /where it's|we believe|watch now/i.test(title)) return;
    const paragraphs = section
      .find("p")
      .map((_, p) => plain($(p).html()))
      .get()
      .filter(Boolean);
    const body = [...new Set(paragraphs)]
      .filter((p) => p.toLowerCase() !== title.toLowerCase())
      .join("\n\n");
    if (body.length < 30) return;
    const style =
      section.attr("style") ||
      section.find('[style*="background-image"]').first().attr("style") ||
      "";
    const image = safeUrl(
      section
        .find(".photo-container img")
        .attr("srcset")
        ?.split(",")[0]
        ?.trim()
        .split(" ")[0] || style.match(/url\(['"]?([^'"\)]+)/)?.[1],
    );
    announcements.push({
      id: section.attr("id") || `announcement-${announcements.length}`,
      title,
      body,
      url: `${SITE}/#${section.attr("id") || ""}`,
      image,
    });
  });
  const links: Content["links"] = [];
  const seen = new Set<string>();
  for (const html of [home, connect]) {
    const page = cheerio.load(html);
    page("a[href]").each((_, el) => {
      const url = safeUrl(page(el).attr("href"));
      const title = plain(page(el).text());
      if (!url || !title || seen.has(url)) return;
      const destination = new URL(url);
      if (!(
        destination.hostname === "forms.ministryforms.net" ||
        destination.hostname === "ccfortwayne.churchcenter.com" ||
        (destination.hostname === "fwcc.cc" &&
          /\/im-new|\/family-ministries|\/get-baptized|\/baptism/.test(
            destination.pathname,
          ))
      ))
        return;
      seen.add(url);
      links.push({ id: `link-${links.length}`, title, url });
    });
  }
  const give = cheerio.load(giving);
  const givingUrl = safeUrl(
    give('a[href*="givingflow.rebelgive.com"]').first().attr("href"),
  );
  if (!givingUrl || !links.length || !announcements.length)
    throw new Error("Website selectors no longer match expected content");
  return { announcements, links, givingUrl };
}
export async function scrapeWebsite(
  now = new Date(),
  readPublic: (url: string) => Promise<string> = fetchPublic,
): Promise<Content> {
  const home = await readPublic(SITE + "/");
  const { mediaUrl, calendarUrl } = discover(home);
  const start = DateTime.fromJSDate(now, {
    zone: "America/New_York",
  }).toISODate()!;
  const end = DateTime.fromJSDate(now, { zone: "America/New_York" })
    .plus({ days: 90 })
    .toISODate()!;
  const readEvents = async () => {
    const records: unknown[] = [];
    for (let page = 1; page <= 10; page++) {
      const query = new URLSearchParams({
        "filter[start_date]": start,
        "filter[end_date]": end,
        "paging[size]": "100",
        "paging[number]": String(page),
        "paging[sort]": "asc",
      });
      const batch: unknown = JSON.parse(
        await readPublic(`${calendarUrl}/events?${query}`),
      );
      if (!Array.isArray(batch))
        throw new Error("Unexpected calendar response");
      records.push(...batch);
      if (batch.length < 100) return records;
    }
    throw new Error("Calendar exceeded expected page limit");
  };
  const [media, events, connect, giving] = await Promise.all([
    readPublic(mediaUrl),
    readEvents(),
    readPublic(SITE + "/get-connected"),
    readPublic(SITE + "/give-online"),
  ]);
  const pages = parsePages(home, connect, giving);
  return contentSchema.parse({
    version: 1,
    fetchedAt: now.toISOString(),
    source: "website",
    church: {
      name: "Christ's Church",
      address: "3131 Maplecrest Rd, Fort Wayne, IN",
      phone: "260-485-1611",
      email: "frontdesk@fwcc.cc",
      services: "Sundays at 9:00 & 11:00 AM",
      website: SITE + "/",
      givingUrl: pages.givingUrl,
    },
    messages: parseMessages(JSON.parse(media)),
    events: parseEvents(events, now),
    announcements: pages.announcements,
    links: pages.links,
  });
}
