import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Appearance, Platform, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { createStyles, darkColors, lightColors } from "./styles";

type Preference = "system" | "light" | "dark";
const key = "fwcc:appearance:v1";
const valid = (value: unknown): value is Preference =>
  value === "system" || value === "light" || value === "dark";
const ThemeContext = createContext<{
  s: ReturnType<typeof createStyles>;
  c: typeof lightColors;
  dark: boolean;
  preference: Preference;
  setPreference: (value: Preference) => void;
  error: string;
} | null>(null);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, update] = useState<Preference>("system");
  const [error, setError] = useState("");
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key)
      .then((value) => {
        if (active && !changed.current && valid(value)) update(value);
      })
      .catch(() => {
        if (active)
          setError("Your appearance preference could not be restored.");
      });
    return () => {
      active = false;
    };
  }, []);
  const dark = (preference === "system" ? system : preference) === "dark";
  const c = dark ? darkColors : lightColors;
  const s = useMemo(() => createStyles(c), [c]);
  useEffect(() => {
    if (Platform.OS !== "web")
      Appearance.setColorScheme(
        preference === "system" ? "unspecified" : preference,
      );
  }, [preference]);
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(c.cream).catch(() => {});
  }, [c]);
  function setPreference(value: Preference) {
    changed.current = true;
    update(value);
    writes.current = writes.current.then(async () => {
      try {
        await AsyncStorage.setItem(key, value);
        setError("");
      } catch {
        setError("Appearance changed, but could not be saved for next time.");
      }
    });
  }
  return (
    <ThemeContext.Provider
      value={{ s, c, dark, preference, setPreference, error }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("ThemeProvider is missing");
  return theme;
}
