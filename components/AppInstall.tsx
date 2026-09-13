"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function AppInstall() {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      } else {
        // A production service worker must never control the Next.js dev server:
        // its cached HTML can reference CSS chunks that Turbopack has already replaced.
        void navigator.serviceWorker.getRegistrations().then(registrations =>
          Promise.all(registrations.map(registration => registration.unregister())),
        ).catch(() => undefined);
        if ("caches" in window) {
          void caches.keys().then(keys =>
            Promise.all(keys.filter(key => key.startsWith("opole-camera-map-")).map(key => caches.delete(key))),
          ).catch(() => undefined);
        }
      }
    }
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);
  async function install() {
    if (window.matchMedia("(display-mode: standalone)").matches) { setMessage(t("installed")); return; }
    if (!prompt) { setMessage(t("installHelp")); return; }
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") setMessage(t("installed"));
    setPrompt(null);
  }
  return <div className="install-app"><button type="button" onClick={install}>{t("install")}</button>{message && <p role="status">{message}</p>}</div>;
}
