import { Linking, Platform, Share } from "react-native";
import * as WebBrowser from "expo-web-browser";
import type { ChurchEvent } from "./content/schema";

export async function openUrl(url: string) {
  const protocol = new URL(url).protocol;
  if (!["https:", "tel:", "mailto:"].includes(protocol))
    throw new Error("This link cannot be opened.");
  if (protocol === "https:" && Platform.OS !== "web")
    await WebBrowser.openBrowserAsync(url);
  else await Linking.openURL(url);
}
export async function shareLink(title: string, url: string) {
  if (Platform.OS === "web") {
    if (navigator.share) await navigator.share({ title, url });
    else {
      await navigator.clipboard.writeText(url);
      return "Link copied to clipboard.";
    }
  } else
    await Share.share({
      title,
      message: `${title}\n${url}`,
      ...(Platform.OS === "ios" ? { url } : {}),
    });
}
export async function addToCalendar(event: ChurchEvent) {
  if (Platform.OS === "web") {
    const date = (s: string) =>
      new Date(s)
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    const escape = (s: string) =>
      s
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;")
        .replace(/\r/g, "");
    const dates = event.allDay
      ? [
          `DTSTART;VALUE=DATE:${event.start.slice(0, 10).replace(/-/g, "")}`,
          `DTEND;VALUE=DATE:${event.end.slice(0, 10).replace(/-/g, "")}`,
        ]
      : [`DTSTART:${date(event.start)}`, `DTEND:${date(event.end)}`];
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//FWCC//Church App//EN",
      "BEGIN:VEVENT",
      `UID:${event.id}@fwcc.cc`,
      `DTSTAMP:${date(new Date().toISOString())}`,
      `SUMMARY:${escape(event.title)}`,
      ...dates,
      `LOCATION:${escape(event.location)}`,
      `DESCRIPTION:${escape(event.description)}`,
      `URL:${event.url}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    const url = URL.createObjectURL(
      new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "fwcc-event.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const Calendar = await import("expo-calendar/legacy");
  await Calendar.createEventInCalendarAsync({
    title: event.title,
    startDate: new Date(event.start),
    endDate: new Date(event.end),
    timeZone: event.timezone,
    allDay: event.allDay,
    location: event.location,
    notes: event.description,
    url: event.url,
  });
}
export async function remindMe(event: ChurchEvent) {
  if (Platform.OS === "web")
    throw new Error(
      "Event reminders are available in the iPhone and Android app. You can add this event to your calendar here.",
    );
  const date = new Date(Date.parse(event.start) - 60 * 60_000);
  if (date.getTime() <= Date.now())
    throw new Error(
      "This event starts in less than an hour. Add it to your calendar instead.",
    );
  const N = await import("expo-notifications");
  if (Platform.OS === "android")
    await N.setNotificationChannelAsync("events", {
      name: "Event reminders",
      importance: N.AndroidImportance.DEFAULT,
    });
  const permission = await N.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Notifications are disabled. You can enable them in your phone settings.",
    );
  await N.cancelScheduledNotificationAsync(`fwcc-event-${event.id}`);
  await N.scheduleNotificationAsync({
    identifier: `fwcc-event-${event.id}`,
    content: {
      title: event.title,
      body: "Starts in one hour. We look forward to seeing you!",
      data: { eventId: event.id },
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: "events",
    },
  });
  return "Reminder set for one hour before this event. Check the event page for any changes before you go.";
}
export async function clearReminders() {
  if (Platform.OS === "web")
    return "There are no phone reminders in the web preview.";
  const N = await import("expo-notifications");
  const reminders = await N.getAllScheduledNotificationsAsync();
  await Promise.all(
    reminders
      .filter((r) => r.identifier.startsWith("fwcc-event-"))
      .map((r) => N.cancelScheduledNotificationAsync(r.identifier)),
  );
  return "All FWCC event reminders have been removed.";
}
