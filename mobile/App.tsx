import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NotificationResponse } from "expo-notifications";
import { useContent, useFavorites } from "./src/content/useContent";
import type { ChurchEvent, Message } from "./src/content/schema";
import {
  addToCalendar,
  clearReminders,
  openUrl,
  remindMe,
  shareLink,
} from "./src/actions";
import MessagePlayer from "./src/MessagePlayer";
import { ThemeProvider, useTheme } from "./src/theme";

type Tab = "Home" | "Messages" | "Events" | "Connect" | "Give";
type Detail =
  | { kind: "message"; item: Message }
  | { kind: "event"; item: ChurchEvent }
  | { kind: "settings" }
  | null;
type Icon = React.ComponentProps<typeof Ionicons>["name"];
type NextStep = {
  title: string;
  body: string;
  icon: Icon;
  action: () => void;
};
const icons: Record<Tab, Icon> = {
  Home: "home-outline",
  Messages: "play-circle-outline",
  Events: "calendar-outline",
  Connect: "people-outline",
  Give: "heart-outline",
};
const eventDate = (e: ChurchEvent, options: Intl.DateTimeFormatOptions) =>
  new Date(e.start).toLocaleDateString("en-US", {
    ...options,
    timeZone: e.timezone,
  });
const eventTime = (e: ChurchEvent) =>
  e.allDay
    ? "All day"
    : new Date(e.start).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: e.timezone,
      });
const messageDate = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const eventStatus = (event: ChurchEvent) => {
  const now = new Date();
  const start = new Date(event.start);
  const diff = start.getTime() - now.getTime();
  const hours = Math.ceil(diff / 3600000);
  const days = Math.ceil(diff / 86400000);
  if (sameLocalDay(start, now)) return "Today";
  if (hours > 0 && hours <= 48) return hours <= 24 ? "Tomorrow" : "This week";
  if (days > 0 && days <= 7) return "This week";
  if (event.registrationUrl) return "Registration open";
  if (event.featured) return "Featured";
  return "";
};
const nextSundayLabel = () => {
  const today = new Date();
  if (today.getDay() === 0) return "Sunday mode";
  const days = (7 - today.getDay()) % 7;
  return `${days} day${days === 1 ? "" : "s"} until Sunday`;
};
const onboardingKey = "fwcc:onboarding-dismissed:v1";
function Button({
  title,
  icon,
  onPress,
  secondary = false,
  loading = false,
}: {
  title: string;
  icon?: Icon;
  onPress: () => void;
  secondary?: boolean;
  loading?: boolean;
}) {
  const { s, c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        pressed && s.pressed,
      ]}
    >
      {loading && (
        <ActivityIndicator size="small" color={secondary ? c.ink : c.onGold} />
      )}
      {!loading && icon && (
        <Ionicons
          accessible={false}
          aria-hidden={true}
          name={icon}
          size={19}
          color={secondary ? c.ink : c.onGold}
        />
      )}
      <Text style={[s.buttonText, secondary && { color: c.ink }]}>
        {loading ? "Refreshing…" : title}
      </Text>
    </Pressable>
  );
}
function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: Icon;
  label: string;
  onPress: () => void;
}) {
  const { s, c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [s.iconButton, pressed && s.pressed]}
    >
      <Ionicons
        accessible={false}
        aria-hidden={true}
        name={icon}
        size={23}
        color={c.ink}
      />
    </Pressable>
  );
}
function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  const { s, c } = useTheme();
  return (
    <View style={s.section}>
      <Text accessibilityRole="header" style={s.sectionTitle}>
        {title}
      </Text>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={s.textAction}
        >
          <Text style={s.actionText}>{action} →</Text>
        </Pressable>
      )}
    </View>
  );
}
function Empty({ title, body }: { title: string; body: string }) {
  const { s, c } = useTheme();
  return (
    <View style={s.empty}>
      <Ionicons
        accessible={false}
        aria-hidden={true}
        name="leaf-outline"
        size={28}
        color={c.muted}
      />
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={s.body}>{body}</Text>
    </View>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ChurchApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
function ChurchApp() {
  const {
    s,
    c,
    dark,
    preference,
    setPreference,
    error: themeError,
  } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 375 || fontScale > 1.3;
  const { content, refreshing, refresh, status } = useContent();
  const { favorites, toggle, ready, error } = useFavorites();
  const [tab, setTab] = useState<Tab>("Home");
  const [detail, setDetail] = useState<Detail>(null);
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [eventFilter, setEventFilter] = useState("All events");
  const [notice, setNotice] = useState("");
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showWelcomePath, setShowWelcomePath] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const events = content.events.filter((e) => Date.parse(e.end) >= Date.now());
  const latest = content.messages[0];
  const savedMessages = content.messages.filter((m) =>
    favorites.includes(m.id),
  );
  const nextEvent = events[0];
  const sundayMode = new Date().getDay() === 0;
  const series = content.announcements.find(
    (a) => a.title.toUpperCase() === latest?.series.toUpperCase(),
  );
  const connection = content.links.find((l) =>
    new URL(l.url).hostname.endsWith("churchcenter.com"),
  );
  const matches = content.messages.filter(
    (m) =>
      (!savedOnly || favorites.includes(m.id)) &&
      `${m.title} ${m.series} ${m.speaker}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await action();
      if (typeof result === "string") setNotice(result);
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        setNotice(
          e instanceof Error
            ? e.message
            : "Something went wrong. Please try again.",
        );
    } finally {
      setBusy(false);
    }
  };
  const go = (next: Tab) => {
    setTab(next);
    setQuery("");
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const show = (next: Detail) => {
    setPlaying(false);
    setDetail(next);
  };
  const dismissWelcomePath = () => {
    setShowWelcomePath(false);
    void AsyncStorage.setItem(onboardingKey, "1").catch(() => {});
  };
  const prayerUrl = `mailto:${content.church.email}?subject=${encodeURIComponent(
    "Prayer request",
  )}`;
  const nextSteps: NextStep[] = [
    {
      title: "I'm new",
      body: "Plan a visit, see service times, and send a connection card.",
      icon: "sparkles-outline",
      action: () => go("Connect"),
    },
    {
      title: "I need prayer",
      body: "Reach out to the church team for care and encouragement.",
      icon: "chatbubble-ellipses-outline",
      action: () => run(() => openUrl(prayerUrl)),
    },
    {
      title: "I want to serve",
      body: "Explore teams and opportunities to get involved.",
      icon: "hand-left-outline",
      action: () => run(() => openUrl("https://fwcc.cc/get-connected")),
    },
    {
      title: "Find community",
      body: "Connect with groups, ministries, and people walking with you.",
      icon: "people-outline",
      action: () => run(() => openUrl("https://fwcc.cc/get-connected")),
    },
    {
      title: "Baptism",
      body: "Take a public next step in following Jesus.",
      icon: "water-outline",
      action: () => run(() => openUrl("https://fwcc.cc/get-connected")),
    },
  ];
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (detail) {
        setDetail(null);
        return true;
      }
      if (tab !== "Home") {
        go("Home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [detail, tab]);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(onboardingKey)
      .then((value) => {
        if (active && value !== "1") setShowWelcomePath(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (Platform.OS === "web") return;
    let cleanup: (() => void) | undefined;
    let active = true;
    import("expo-notifications")
      .then((N) => {
        if (!active) return;
        N.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });
        const open = (response: NotificationResponse | null) => {
          const id = response?.notification.request.content.data?.eventId;
          const event = content.events.find((e) => e.id === id);
          if (event) {
            show({ kind: "event", item: event });
            void N.clearLastNotificationResponseAsync();
          }
        };
        void N.getLastNotificationResponseAsync().then(open);
        const listener = N.addNotificationResponseReceivedListener(open);
        cleanup = () => listener.remove();
      })
      .catch(() => {});
    return () => {
      active = false;
      cleanup?.();
    };
  }, [content.events]);
  const EventCard = ({ event }: { event: ChurchEvent }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${eventDate(event, { month: "long", day: "numeric" })}, ${eventTime(event)}`}
      onPress={() => show({ kind: "event", item: event })}
      style={({ pressed }) => [s.eventCard, pressed && s.pressed]}
    >
      <View style={s.dateBadge}>
        <Text style={s.month}>
          {eventDate(event, { month: "short" }).toUpperCase()}
        </Text>
        <Text style={s.day}>{eventDate(event, { day: "numeric" })}</Text>
      </View>
      <View style={s.flex}>
        {event.featured && <Text style={s.eyebrow}>DON’T MISS IT</Text>}
        <Text style={s.cardTitle}>{event.title}</Text>
        <Text style={s.meta}>
          {eventDate(event, { weekday: "short" })} · {eventTime(event)} ET
        </Text>
        <Text style={s.meta} numberOfLines={1}>
          {event.location}
        </Text>
      </View>
      {!!eventStatus(event) && (
        <View style={s.statusPill}>
          <Text style={s.statusText}>{eventStatus(event)}</Text>
        </View>
      )}
      <Ionicons
        accessible={false}
        aria-hidden={true}
        name="chevron-forward"
        size={18}
        color={c.muted}
      />
    </Pressable>
  );
  const MessageCard = ({
    message,
    hero = false,
  }: {
    message: Message;
    hero?: boolean;
  }) => (
    <View style={[s.messageCard, !hero && s.messageRow]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Watch ${message.title}`}
        onPress={() => show({ kind: "message", item: message })}
        style={
          hero ? s.messageImage : [s.smallImage, compact && s.smallImageCompact]
        }
      >
        {message.image && (
          <Image source={{ uri: message.image }} style={s.fillImage} />
        )}
        <View style={s.play}>
          <Ionicons
            accessible={false}
            aria-hidden={true}
            name="play"
            size={hero ? 24 : 16}
            color={c.white}
          />
        </View>
        {hero && (
          <View style={s.imageLabel}>
            <Text style={s.imageLabelText}>LATEST MESSAGE</Text>
          </View>
        )}
      </Pressable>
      <View style={[s.messageInfo, !hero && s.messageRowInfo]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => show({ kind: "message", item: message })}
        >
          <Text style={s.eyebrow}>{message.series || "SUNDAY MESSAGE"}</Text>
          <Text style={[s.cardTitle, hero && { fontSize: 23, lineHeight: 29 }]}>
            {message.title}
          </Text>
          <Text style={s.meta}>
            {message.speaker} · {messageDate(message.date)}
          </Text>
        </Pressable>
      </View>
      <Pressable
        disabled={!ready}
        accessibilityRole="button"
        accessibilityLabel={`${favorites.includes(message.id) ? "Unsave" : "Save"} ${message.title}`}
        accessibilityState={{
          selected: favorites.includes(message.id),
          disabled: !ready,
        }}
        onPress={() => toggle(message.id)}
        style={s.save}
      >
        <Ionicons
          accessible={false}
          aria-hidden={true}
          name={
            favorites.includes(message.id) ? "bookmark" : "bookmark-outline"
          }
          size={22}
          color={c.ink}
        />
      </Pressable>
    </View>
  );
  const NextStepCard = ({ step }: { step: NextStep }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={step.title}
      onPress={step.action}
      style={({ pressed }) => [s.nextStepCard, pressed && s.pressed]}
    >
      <View style={s.nextStepIcon}>
        <Ionicons
          accessible={false}
          aria-hidden={true}
          name={step.icon}
          size={22}
          color={c.ink}
        />
      </View>
      <View style={s.flex}>
        <Text style={s.cardTitle}>{step.title}</Text>
        <Text style={s.meta}>{step.body}</Text>
      </View>
      <Ionicons
        accessible={false}
        aria-hidden={true}
        name="arrow-forward"
        size={18}
        color={c.muted}
      />
    </Pressable>
  );
  return (
    <SafeAreaView style={s.root} edges={["top", "left", "right"]}>
      <StatusBar style={dark ? "light" : "dark"} />
      <View style={s.shell}>
        <View style={[s.header, compact && s.headerCompact]}>
          <View style={s.brand}>
            <Image
              source={require("./assets/cc-header.png")}
              style={[s.brandMark, dark && { tintColor: c.ink }]}
              accessible={false}
              resizeMode="contain"
            />
            <View style={s.flex}>
              <Text style={s.brandName}>CHRIST’S CHURCH</Text>
              <Text style={s.brandPlace}>FORT WAYNE, INDIANA</Text>
            </View>
          </View>
          <IconButton
            icon="settings-outline"
            label="App settings"
            onPress={() => show({ kind: "settings" })}
          />
        </View>
        <ScrollView
          ref={scroll}
          style={s.scroll}
          contentContainerStyle={[s.content, compact && s.contentCompact]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={c.ink}
            />
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {tab === "Home" && (
            <>
              <View style={s.welcomeRow}>
                <Text style={s.eyebrow}>A PLACE TO BELONG</Text>
                <View style={s.locationPill}>
                  <View style={s.dot} />
                  <Text style={s.pillText}>You’re welcome here</Text>
                </View>
              </View>
              {showWelcomePath && (
                <View style={s.pathPanel}>
                  <View style={s.todayHeader}>
                    <View style={s.flex}>
                      <Text style={s.eyebrow}>WELCOME</Text>
                      <Text style={s.sectionTitle}>
                        What are you looking for?
                      </Text>
                    </View>
                    <IconButton
                      icon="close"
                      label="Dismiss welcome choices"
                      onPress={dismissWelcomePath}
                    />
                  </View>
                  <View style={s.choiceGrid}>
                    {nextSteps.slice(0, 3).map((step) => (
                      <Pressable
                        key={step.title}
                        accessibilityRole="button"
                        accessibilityLabel={step.title}
                        onPress={() => {
                          dismissWelcomePath();
                          step.action();
                        }}
                        style={({ pressed }) => [
                          s.choiceTile,
                          pressed && s.pressed,
                        ]}
                      >
                        <Ionicons
                          accessible={false}
                          aria-hidden={true}
                          name={step.icon}
                          size={21}
                          color={c.ink}
                        />
                        <Text style={s.choiceText}>{step.title}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              <View style={[s.hero, compact && s.heroCompact]}>
                <View style={s.heroCircle} />
                <View style={s.heroBeam} />
                <View style={s.heroGrid} />
                <Text style={s.heroEyebrow}>COME AS YOU ARE.</Text>
                <Text
                  accessibilityRole="header"
                  style={[s.heroTitle, compact && s.heroTitleCompact]}
                >
                  It’s ok to{"\n"}not be ok.
                </Text>
                <Text style={s.heroBody}>
                  Find hope. Find community.{"\n"}Take your next step with us.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Plan your visit"
                  onPress={() => go("Connect")}
                  style={({ pressed }) => [s.heroButton, pressed && s.pressed]}
                >
                  <Text style={s.buttonText}>Plan your visit</Text>
                  <Ionicons
                    accessible={false}
                    aria-hidden={true}
                    name="arrow-forward"
                    size={20}
                    color={c.onGold}
                  />
                </Pressable>
              </View>
              <View style={s.serviceStrip}>
                <Ionicons
                  accessible={false}
                  aria-hidden={true}
                  name="sunny-outline"
                  size={23}
                  color={c.ink}
                />
                <View style={s.flex}>
                  <Text style={s.serviceTitle}>{content.church.services}</Text>
                  <Text style={s.meta}>3131 Maplecrest Rd · Fort Wayne</Text>
                </View>
              </View>
              <View style={s.todayPanel}>
                <View style={s.todayHeader}>
                  <View style={s.flex}>
                    <Text style={s.eyebrow}>
                      {sundayMode ? "READY FOR TODAY" : "PLAN AHEAD"}
                    </Text>
                    <Text style={s.sectionTitle}>
                      {sundayMode
                        ? "Sunday at Christ's Church"
                        : nextSundayLabel()}
                    </Text>
                  </View>
                  <Ionicons
                    accessible={false}
                    aria-hidden={true}
                    name={sundayMode ? "sparkles-outline" : "calendar-outline"}
                    size={24}
                    color={c.ink}
                  />
                </View>
                <View style={s.statGrid}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => go("Connect")}
                    style={s.statTile}
                  >
                    <Text style={s.statValue}>Visit</Text>
                    <Text style={s.meta}>{content.church.services}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      nextEvent
                        ? show({ kind: "event", item: nextEvent })
                        : go("Events")
                    }
                    style={s.statTile}
                  >
                    <Text style={s.statValue}>
                      {nextEvent ? eventStatus(nextEvent) || "Next" : "Events"}
                    </Text>
                    <Text style={s.meta} numberOfLines={2}>
                      {nextEvent ? nextEvent.title : "See what's coming up"}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <View style={s.quickActions}>
                {(["Messages", "Events", "Give"] as Tab[]).map((t) => (
                  <Pressable
                    key={t}
                    accessibilityRole="button"
                    onPress={() => go(t)}
                    style={s.quickAction}
                  >
                    <View style={s.quickIcon}>
                      <Ionicons
                        accessible={false}
                        aria-hidden={true}
                        name={icons[t]}
                        size={24}
                        color={c.ink}
                      />
                    </View>
                    <Text style={s.quickText}>
                      {t === "Messages" ? "Watch" : t}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {!!savedMessages.length && (
                <>
                  <Section
                    title="Saved for later"
                    action="Open saved"
                    onPress={() => {
                      setSavedOnly(true);
                      go("Messages");
                    }}
                  />
                  {savedMessages.slice(0, 2).map((message) => (
                    <MessageCard key={message.id} message={message} />
                  ))}
                </>
              )}
              <Section
                title="Latest message"
                action="View all"
                onPress={() => go("Messages")}
              />
              {latest ? (
                <MessageCard message={latest} hero />
              ) : (
                <Empty
                  title="Messages are on the way"
                  body="Check back soon for a message from Christ’s Church."
                />
              )}
              <Section
                title="Life together"
                action="All events"
                onPress={() => go("Events")}
              />
              {events.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              {!events.length && (
                <Empty
                  title="More to come"
                  body="Visit the church website for the latest event announcements."
                />
              )}
              <View style={s.connectBanner}>
                <Ionicons
                  accessible={false}
                  aria-hidden={true}
                  name="people-outline"
                  size={28}
                  color={c.ink}
                />
                <Text style={s.sectionTitle}>
                  You don’t have to do life alone.
                </Text>
                <Text style={s.body}>
                  There’s a next step for everyone. Let’s find yours.
                </Text>
                <Button
                  title="Get connected"
                  icon="arrow-forward"
                  secondary
                  onPress={() => go("Connect")}
                />
                <Button
                  title="Request prayer"
                  icon="chatbubble-ellipses-outline"
                  secondary
                  onPress={() => run(() => openUrl(prayerUrl))}
                />
              </View>
              <Section title="Around the church" />
              {content.announcements
                .filter((a) => a.image && a.id !== series?.id)
                .slice(0, 3)
                .map((a) => (
                  <Pressable
                    key={a.id}
                    accessibilityRole="button"
                    onPress={() => run(() => openUrl(a.url))}
                    style={s.announcement}
                  >
                    {a.image && (
                      <Image
                        source={{ uri: a.image }}
                        style={s.announcementImage}
                      />
                    )}
                    <View style={s.messageInfo}>
                      <Text style={s.cardTitle}>
                        {a.title.replace(/\s+/g, " ")}
                      </Text>
                      <Text style={s.body} numberOfLines={3}>
                        {a.body}
                      </Text>
                      <Text style={s.actionText}>Read more ↗</Text>
                    </View>
                  </Pressable>
                ))}
            </>
          )}
          {tab === "Messages" && (
            <>
              <Text style={s.eyebrow}>GROW THROUGH THE WEEK</Text>
              <Text
                accessibilityRole="header"
                style={[s.pageTitle, compact && s.pageTitleCompact]}
              >
                Messages
              </Text>
              <Text style={s.lead}>
                A little encouragement. A next step in faith.
              </Text>
              <View style={s.search}>
                <Ionicons
                  accessible={false}
                  aria-hidden={true}
                  name="search-outline"
                  size={21}
                  color={c.muted}
                />
                <TextInput
                  accessibilityLabel="Search messages"
                  placeholder="Search messages…"
                  placeholderTextColor={c.muted}
                  autoCorrect={false}
                  returnKeyType="search"
                  keyboardAppearance={dark ? "dark" : "light"}
                  value={query}
                  onChangeText={setQuery}
                  style={s.searchInput}
                />
                {!!query && (
                  <IconButton
                    icon="close"
                    label="Clear search"
                    onPress={() => setQuery("")}
                  />
                )}
              </View>
              <View style={s.filters}>
                {[false, true].map((value) => (
                  <Pressable
                    key={String(value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: savedOnly === value }}
                    onPress={() => setSavedOnly(value)}
                    style={[s.filter, savedOnly === value && s.filterActive]}
                  >
                    <Text
                      style={[
                        s.filterText,
                        savedOnly === value && s.filterTextActive,
                      ]}
                    >
                      {value ? `Saved (${favorites.length})` : "All messages"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {matches.map((m) => (
                <MessageCard key={m.id} message={m} />
              ))}
              {!matches.length && (
                <Empty
                  title={
                    savedOnly
                      ? "Your saved messages live here"
                      : "No messages found"
                  }
                  body={
                    savedOnly
                      ? "Tap the bookmark on a message to come back to it later."
                      : "Try another title, series, or speaker."
                  }
                />
              )}
              {!!error && (
                <Text accessibilityRole="alert" style={s.body}>
                  {error}
                </Text>
              )}
            </>
          )}
          {tab === "Events" && (
            <>
              <Text style={s.eyebrow}>THERE’S A PLACE FOR YOU</Text>
              <Text
                accessibilityRole="header"
                style={[s.pageTitle, compact && s.pageTitleCompact]}
              >
                Life together.
              </Text>
              <Text style={s.lead}>Make room for community.</Text>
              <View style={s.filters}>
                {["All events", "Featured"].map((f) => (
                  <Pressable
                    key={f}
                    accessibilityRole="button"
                    accessibilityState={{ selected: eventFilter === f }}
                    onPress={() => setEventFilter(f)}
                    style={[s.filter, eventFilter === f && s.filterActive]}
                  >
                    <Text
                      style={[
                        s.filterText,
                        eventFilter === f && s.filterTextActive,
                      ]}
                    >
                      {f}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {events
                .filter((e) => eventFilter !== "Featured" || e.featured)
                .map((e) => (
                  <EventCard event={e} key={e.id} />
                ))}
              {!events.some(
                (e) => eventFilter !== "Featured" || e.featured,
              ) && (
                <Empty
                  title="Check back soon"
                  body="New opportunities to connect will appear here."
                />
              )}
              <Text style={s.footnote}>
                Times shown in the church’s Eastern time zone.
              </Text>
              <Button
                title="View church calendar"
                secondary
                icon="open-outline"
                onPress={() => run(() => openUrl("https://fwcc.cc/coming-up"))}
              />
            </>
          )}
          {tab === "Connect" && (
            <>
              <Text style={s.eyebrow}>YOUR NEXT STEP STARTS HERE</Text>
              <Text
                accessibilityRole="header"
                style={[s.pageTitle, compact && s.pageTitleCompact]}
              >
                You belong.
              </Text>
              <Text style={s.lead}>
                New here or here every week, we’re glad you’re part of the
                story.
              </Text>
              <View style={s.pathPanel}>
                <Text style={s.eyebrow}>NEXT STEPS</Text>
                <Text style={s.sectionTitle}>
                  Find the right starting point.
                </Text>
                {nextSteps.map((step) => (
                  <NextStepCard key={step.title} step={step} />
                ))}
              </View>
              <View style={s.visitCard}>
                <Ionicons
                  accessible={false}
                  aria-hidden={true}
                  name="sunny-outline"
                  size={32}
                  color={c.ink}
                />
                <Text style={s.sectionTitle}>See you Sunday.</Text>
                <Text style={s.body}>
                  {content.church.services}
                  {"\n"}
                  {content.church.address}
                </Text>
                <Button
                  title="Get directions"
                  icon="navigate-outline"
                  onPress={() =>
                    run(() =>
                      openUrl(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(content.church.address)}`,
                      ),
                    )
                  }
                />
                <Button
                  title="What to expect"
                  secondary
                  onPress={() => run(() => openUrl("https://fwcc.cc/im-new"))}
                />
              </View>
              {connection && (
                <Button
                  title="Fill out a connection card"
                  icon="chatbubble-outline"
                  onPress={() => run(() => openUrl(connection.url))}
                />
              )}
              <Section title="Find your community" />
              {content.links
                .filter(
                  (l) =>
                    !["HERE", "CONTACT US", "Background Check Form"].includes(
                      l.title,
                    ) &&
                    l.id !== connection?.id &&
                    l.title !== "I'm New",
                )
                .map((l) => (
                  <Pressable
                    key={l.id}
                    accessibilityRole="button"
                    onPress={() => run(() => openUrl(l.url))}
                    style={s.linkRow}
                  >
                    <Text style={[s.cardTitle, s.flex]}>
                      {l.title === "Family Ministries"
                        ? "Early Learning Center"
                        : l.title}
                    </Text>
                    <Ionicons
                      accessible={false}
                      aria-hidden={true}
                      name="arrow-forward"
                      size={20}
                      color={c.muted}
                    />
                  </Pressable>
                ))}
              <Section title="Let’s talk" />
              <Button
                title={content.church.phone}
                secondary
                icon="call-outline"
                onPress={() =>
                  run(() => openUrl(`tel:${content.church.phone}`))
                }
              />
              <Button
                title="Email the church"
                secondary
                icon="mail-outline"
                onPress={() =>
                  run(() => openUrl(`mailto:${content.church.email}`))
                }
              />
            </>
          )}
          {tab === "Give" && (
            <>
              <View style={s.giveHero}>
                <View style={s.heroCircle} />
                <View style={s.heroBeam} />
                <View style={s.giveIcon}>
                  <Ionicons
                    accessible={false}
                    aria-hidden={true}
                    name="heart-outline"
                    size={44}
                    color={c.gold}
                  />
                </View>
                <Text style={s.heroEyebrow}>GENEROSITY MAKES A DIFFERENCE</Text>
                <Text
                  accessibilityRole="header"
                  style={[s.giveTitle, compact && s.giveTitleCompact]}
                >
                  Love in action.
                </Text>
                <Text style={s.heroBody}>
                  Your generosity helps people take their next step toward hope
                  and healing.
                </Text>
              </View>
              <View style={s.visitCard}>
                <Text style={s.sectionTitle}>Give to Christ’s Church</Text>
                <Text style={s.body}>
                  Continue to our secure giving partner to make a gift or manage
                  your giving.
                </Text>
                <Button
                  title="Continue to giving"
                  icon="heart-outline"
                  onPress={() => run(() => openUrl(content.church.givingUrl))}
                />
                <View style={s.serviceStrip}>
                  <Ionicons
                    accessible={false}
                    aria-hidden={true}
                    name="lock-closed-outline"
                    size={17}
                    color={c.muted}
                  />
                  <Text style={[s.meta, s.flex]}>
                    Your payment details are handled by our giving provider.
                  </Text>
                </View>
              </View>
              <Text style={s.body}>
                Have a question about giving? We’d be happy to help.
              </Text>
              <Button
                title="Contact the church"
                secondary
                icon="mail-outline"
                onPress={() =>
                  run(() => openUrl(`mailto:${content.church.email}`))
                }
              />
            </>
          )}
          <View style={s.footer}>
            <Text style={s.footerBrand}>CHRIST’S CHURCH</Text>
            <Text style={s.footnote}>Helping people take their next step.</Text>
            <Text style={s.footnote}>{status}</Text>
            <Text style={s.footnote}>
              Updated {new Date(content.fetchedAt).toLocaleDateString()}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={refresh}
              disabled={refreshing}
              accessibilityState={{ busy: refreshing, disabled: refreshing }}
              style={s.textAction}
            >
              <Text style={s.actionText}>
                {refreshing ? "Refreshing…" : "Refresh content"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
        <SafeAreaView edges={["bottom"]} style={s.navSafe}>
          <View style={s.nav}>
            {(Object.keys(icons) as Tab[]).map((t) => (
              <Pressable
                key={t}
                accessibilityRole="tab"
                accessibilityLabel={t}
                aria-selected={tab === t}
                accessibilityState={{ selected: tab === t }}
                onPress={() => go(t)}
                style={({ pressed }) => [s.navItem, pressed && s.pressed]}
              >
                <View style={[s.navIcon, tab === t && s.navIconActive]}>
                  <Ionicons
                    accessible={false}
                    aria-hidden={true}
                    name={icons[t]}
                    size={23}
                    color={tab === t ? c.ink : c.muted}
                  />
                </View>
                <Text style={[s.navText, tab === t && s.navTextActive]}>
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
        <Modal
          visible={detail !== null}
          animationType="slide"
          onRequestClose={() => setDetail(null)}
        >
          <SafeAreaProvider>
            <SafeAreaView style={s.root}>
              <View style={s.shell}>
                <View style={s.detailHeader}>
                  <IconButton
                    icon="arrow-back"
                    label="Close details"
                    onPress={() => setDetail(null)}
                  />
                  <Text style={[s.brandName, s.detailHeading]}>
                    {detail?.kind === "settings"
                      ? "APP SETTINGS"
                      : detail?.kind === "event"
                        ? "LIFE TOGETHER"
                        : "SUNDAY MESSAGE"}
                  </Text>
                  <View style={{ width: 44 }} />
                </View>
                <ScrollView
                  contentContainerStyle={[
                    s.content,
                    compact && s.contentCompact,
                  ]}
                >
                  {detail?.kind === "message" && (
                    <>
                      {playing && detail.item.youtubeId ? (
                        <MessagePlayer id={detail.item.youtubeId} />
                      ) : (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Play message"
                          onPress={() =>
                            detail.item.youtubeId
                              ? setPlaying(true)
                              : run(() => openUrl(detail.item.url))
                          }
                          style={s.messageImage}
                        >
                          {detail.item.image && (
                            <Image
                              source={{ uri: detail.item.image }}
                              style={s.fillImage}
                            />
                          )}
                          <View style={s.play}>
                            <Ionicons
                              accessible={false}
                              aria-hidden={true}
                              name="play"
                              size={28}
                              color="white"
                            />
                          </View>
                        </Pressable>
                      )}
                      <Text style={s.eyebrow}>{detail.item.series}</Text>
                      <Text
                        style={[s.pageTitle, compact && s.pageTitleCompact]}
                      >
                        {detail.item.title}
                      </Text>
                      <Text style={s.meta}>
                        {detail.item.speaker} · {messageDate(detail.item.date)}
                      </Text>
                      <View style={s.filters}>
                        <Button
                          title={
                            favorites.includes(detail.item.id)
                              ? "Saved"
                              : "Save message"
                          }
                          secondary
                          icon="bookmark-outline"
                          onPress={() => toggle(detail.item.id)}
                        />
                        <Button
                          title="Share"
                          secondary
                          icon="share-outline"
                          onPress={() =>
                            run(() =>
                              shareLink(detail.item.title, detail.item.url),
                            )
                          }
                        />
                      </View>
                      <Text style={s.body}>{detail.item.description}</Text>
                      <Button
                        title={
                          detail.item.youtubeId
                            ? "Open in YouTube"
                            : "Open message"
                        }
                        icon="open-outline"
                        onPress={() => run(() => openUrl(detail.item.url))}
                      />
                    </>
                  )}
                  {detail?.kind === "event" && (
                    <>
                      <View
                        style={[s.largeDate, compact && s.largeDateCompact]}
                      >
                        <Text style={s.eyebrow}>
                          {eventDate(detail.item, {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          }).toUpperCase()}
                        </Text>
                        <Text
                          style={[s.pageTitle, compact && s.pageTitleCompact]}
                        >
                          {detail.item.title}
                        </Text>
                        <Text style={s.lead}>
                          {eventTime(detail.item)} Eastern
                        </Text>
                        <Text style={s.body}>{detail.item.location}</Text>
                      </View>
                      <Text style={s.body}>
                        {detail.item.description ||
                          "We’d love to see you. Visit the event page for the latest details."}
                      </Text>
                      {detail.item.registrationUrl && (
                        <Button
                          title="Register for this event"
                          icon="arrow-forward"
                          onPress={() =>
                            run(() => openUrl(detail.item.registrationUrl!))
                          }
                        />
                      )}
                      <Button
                        title="Add to calendar"
                        icon="calendar-outline"
                        secondary
                        onPress={() => run(() => addToCalendar(detail.item))}
                      />
                      <Button
                        title="Remind me 1 hour before"
                        icon="notifications-outline"
                        secondary
                        onPress={() => run(() => remindMe(detail.item))}
                      />
                      <Button
                        title="Share event"
                        icon="share-outline"
                        secondary
                        onPress={() =>
                          run(() =>
                            shareLink(detail.item.title, detail.item.url),
                          )
                        }
                      />
                      <Button
                        title="View event website"
                        icon="open-outline"
                        secondary
                        onPress={() => run(() => openUrl(detail.item.url))}
                      />
                    </>
                  )}
                  {detail?.kind === "settings" && (
                    <>
                      <Text
                        style={[s.pageTitle, compact && s.pageTitleCompact]}
                      >
                        Make yourself at home.
                      </Text>
                      <Text style={s.body}>
                        Saved messages and content stay on this device. Event
                        reminders are optional and are scheduled only when you
                        ask for one.
                      </Text>
                      <Section title="Appearance" />
                      <Text style={s.body}>
                        Choose a look, or follow your device’s setting.
                      </Text>
                      <View style={s.filters}>
                        {(["light", "dark", "system"] as const).map((value) => (
                          <Pressable
                            key={value}
                            accessibilityRole="radio"
                            aria-checked={preference === value}
                            accessibilityLabel={`${value[0].toUpperCase() + value.slice(1)} mode`}
                            accessibilityState={{
                              checked: preference === value,
                            }}
                            onPress={() => setPreference(value)}
                            style={({ pressed }) => [
                              s.filter,
                              preference === value && s.filterActive,
                              pressed && s.pressed,
                            ]}
                          >
                            <Text
                              style={[
                                s.filterText,
                                preference === value && s.filterTextActive,
                              ]}
                            >
                              {value[0].toUpperCase() + value.slice(1)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      {!!themeError && (
                        <Text accessibilityRole="alert" style={s.body}>
                          {themeError}
                        </Text>
                      )}
                      <Section title="Reminders" />
                      <Text style={s.body}>
                        A reminder uses the event time when you set it. Check
                        the event page for changes before you go.
                      </Text>
                      <Button
                        title="Clear all event reminders"
                        secondary
                        icon="notifications-off-outline"
                        onPress={() => run(clearReminders)}
                      />
                      {Platform.OS !== "web" && (
                        <Button
                          title="Phone notification settings"
                          secondary
                          onPress={() => run(() => Linking.openSettings())}
                        />
                      )}
                      <Section title="Your content" />
                      <Text style={s.body}>
                        {status}
                        {"\n"}Last updated{" "}
                        {new Date(content.fetchedAt).toLocaleString()}
                      </Text>
                      <Button
                        title="Refresh church content"
                        loading={refreshing}
                        secondary
                        icon="refresh-outline"
                        onPress={refresh}
                      />
                      <Section title="About this app" />
                      <Text style={s.body}>
                        Christ’s Church · Fort Wayne{"\n"}Preview version 0.1.0
                        {"\n\n"}Messages play through YouTube. Giving and forms
                        open the church’s existing providers, which have their
                        own privacy practices. No church member account is
                        required.
                      </Text>
                      <Button
                        title="Contact support"
                        secondary
                        icon="mail-outline"
                        onPress={() =>
                          run(() => openUrl(`mailto:${content.church.email}`))
                        }
                      />
                    </>
                  )}
                </ScrollView>
              </View>
            </SafeAreaView>
          </SafeAreaProvider>
        </Modal>
        {!!notice && (
          <Modal
            transparent
            visible
            animationType="fade"
            onRequestClose={() => setNotice("")}
          >
            <View style={s.noticeBackdrop}>
              <View style={s.notice}>
                <ScrollView contentContainerStyle={s.noticeContent}>
                  <Text accessibilityRole="alert" style={s.body}>
                    {notice}
                  </Text>
                  <Button title="Got it" onPress={() => setNotice("")} />
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
        {busy && (
          <View pointerEvents="none" style={s.busy}>
            <ActivityIndicator color={c.onGold} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
