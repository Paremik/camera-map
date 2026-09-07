"use client";
import { useEffect, useState } from "react";
export function useMapPreferences() {
  const [mapTheme, setMapTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("opole-camera-map:map-theme");
    } catch {
      /* Keep the light map when storage is blocked. */
    }
    if (saved === "dark") setMapTheme("dark");
  }, []);
  function changeTheme(theme: "light" | "dark") {
    setMapTheme(theme);
    try {
      localStorage.setItem("opole-camera-map:map-theme", theme);
    } catch {
      /* Theme still works for this tab. */
    }
  }
  return { mapTheme, changeTheme };
}
