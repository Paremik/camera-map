"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import ru from "@/locales/ru";
import pl from "@/locales/pl";
import uk from "@/locales/uk";
import en from "@/locales/en";

export type Locale = "ru" | "pl" | "uk" | "en";
type Messages = Record<string, string>;

const dictionaries: Record<Locale, Messages> = { ru, pl, uk, en };
const localeNames: Record<Locale, string> = {
  ru: "Русский",
  pl: "Polski",
  uk: "Українська",
  en: "English",
};
const Context = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}>({ locale: "ru", setLocale: () => {}, t: (key) => ru[key] ?? key });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("ru");
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("opole-camera-map:locale");
    } catch {
      /* Keep the default when storage is blocked. */
    }
    const next =
      saved === "pl" || saved === "uk" || saved === "en" || saved === "ru"
        ? saved
        : "ru";
    setLocale(next);
    document.documentElement.lang = next;
  }, []);
  const change = (next: Locale) => {
    setLocale(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem("opole-camera-map:locale", next);
    } catch {
      /* Language still works for this tab. */
    }
  };
  const value = useMemo(
    () => ({
      locale,
      setLocale: change,
      t: (key: string) => dictionaries[locale][key] ?? ru[key] ?? key,
    }),
    [locale],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useI18n() {
  return useContext(Context);
}
export const languages = localeNames;
