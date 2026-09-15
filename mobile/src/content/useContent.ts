import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import bundled from "./bundled.json";
import { scrapeWebsite } from "./website";
import { contentSchema, type Content } from "./schema";

export function useContent() {
  const [content, setContent] = useState<Content>(() =>
    contentSchema.parse(bundled),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState("Saved content");
  const inFlight = useRef(false);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    if (process.env.EXPO_PUBLIC_CONTENT_MODE === "bundled") {
      setStatus("Preview content");
      return;
    }
    const url = process.env.EXPO_PUBLIC_CONTENT_URL;
    const direct =
      Platform.OS !== "web" &&
      (process.env.EXPO_PUBLIC_CONTENT_MODE === "website" || !url);
    if (!direct && !url) {
      setStatus("Saved content · live updates not connected");
      return;
    }
    inFlight.current = true;
    setRefreshing(true);
    try {
      let next: Content;
      let stale = false;
      if (direct) {
        next = await scrapeWebsite();
      } else {
        if (!url!.startsWith("https://") && !__DEV__)
          throw new Error("HTTPS required");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        try {
          const response = await fetch(url!, { signal: controller.signal });
          if (!response.ok) throw new Error("Content unavailable");
          next = contentSchema.parse(await response.json());
          stale =
            response.headers.get("X-Content-Stale") === "true" ||
            Date.now() - Date.parse(next.fetchedAt) > 30 * 60_000;
        } finally {
          clearTimeout(timeout);
        }
      }
      setContent(next);
      setStatus(stale ? "Saved content · updates delayed" : "Up to date");
      try {
        await AsyncStorage.setItem("fwcc:content:v1", JSON.stringify(next));
      } catch {
        setStatus("Up to date · could not save for offline use");
      }
    } catch {
      setStatus("Refresh unavailable · showing saved content");
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cached =
          process.env.EXPO_PUBLIC_CONTENT_MODE === "bundled"
            ? null
            : await AsyncStorage.getItem("fwcc:content:v1");
        if (cached && alive)
          setContent(contentSchema.parse(JSON.parse(cached)));
      } catch {
        /* Use bundled snapshot if cache is invalid. */
      }
      if (alive) void refresh();
    })();
    return () => {
      alive = false;
    };
  }, [refresh]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 15 * 60_000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [refresh]);
  return { content, refreshing, refresh, status };
}
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    AsyncStorage.getItem("fwcc:favorites:v1")
      .then((value) => {
        if (!value) return;
        const parsed: unknown = JSON.parse(value);
        if (
          Array.isArray(parsed) &&
          parsed.every((id) => typeof id === "string")
        )
          setFavorites(parsed);
      })
      .catch(() => setError("Saved messages could not be restored."))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready)
      AsyncStorage.setItem(
        "fwcc:favorites:v1",
        JSON.stringify(favorites),
      ).catch(() =>
        setError("Your saved messages could not be stored on this device."),
      );
  }, [favorites, ready]);
  return {
    favorites,
    ready,
    error,
    toggle: (id: string) => {
      if (ready)
        setFavorites((current) =>
          current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id],
        );
    },
  };
}
