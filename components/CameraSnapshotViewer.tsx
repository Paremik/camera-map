"use client";

import { useEffect, useRef, useState } from "react";
import type { Camera } from "@/lib/camera";
import { latestItsSnapshot, type CameraSnapshot } from "@/lib/camera-view";
import type { CameraAvailability } from "@/lib/map-features";
import { useI18n } from "@/lib/i18n";
import Icon from "./Icon";

type ViewState =
  | { status: "loading" }
  | { status: "image"; snapshot: CameraSnapshot; loaded: boolean }
  | { status: "empty" | "error" };

export default function CameraSnapshotViewer({ camera, onClose, onStatus }: { camera: Camera; onClose: () => void; onStatus: (value: CameraAvailability) => void }) {
  const { locale, t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<ViewState>({ status: "loading" });
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    // Bound metadata and image loading together, including a stalled image request.
    const timeout = window.setTimeout(() => {
      controller.abort();
      setView((state) => state.status === "image" && state.loaded ? state : { status: "error" });
      onStatus({ status: "unavailable", checkedAt: new Date().toISOString() });
    }, 15000);
    timeoutRef.current = timeout;
    async function load() {
      try {
        if (!camera.snapshotSourceUrl) throw new Error("Missing snapshot source");
        const response = await fetch(camera.snapshotSourceUrl, { signal: controller.signal, credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer" });
        if (!response.ok) throw new Error("ITS request failed");
        const snapshot = latestItsSnapshot(await response.json(), camera.id, camera.snapshotSourceUrl);
        if (!controller.signal.aborted) {
          setView(snapshot ? { status: "image", snapshot, loaded: false } : { status: "empty" });
          if (!snapshot) { window.clearTimeout(timeout); onStatus({ status: "unavailable", checkedAt: new Date().toISOString() }); }
        }
      } catch {
        if (!controller.signal.aborted) { setView({ status: "error" }); onStatus({ status: "unavailable", checkedAt: new Date().toISOString() }); }
      }
    }
    void load();
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [camera.id, camera.snapshotSourceUrl, attempt]);
  const loading = view.status === "loading" || (view.status === "image" && !view.loaded);
  function retry() { setView({ status: "loading" }); setAttempt((value) => value + 1); }
  return <dialog ref={dialog} className="snapshot-dialog" aria-labelledby="snapshot-title" onCancel={(event) => { event.preventDefault(); dialog.current?.close(); }} onClose={() => { if (!dialog.current?.open) onClose(); }}>
    <header className="snapshot-heading"><div><p className="eyebrow">{t("snapshotTitle")}</p><h2 id="snapshot-title">{camera.name}</h2><p>{camera.street}</p></div><button className="icon-button" autoFocus aria-label={t("closeView")} onClick={() => dialog.current?.close()}><Icon name="close" /></button></header>
    <div className="snapshot-media" aria-busy={loading}>
      {loading && <p role="status">{t("loadingSnapshot")}</p>}
      {view.status === "image" && <img key={attempt} src={view.snapshot.url} alt={"Снимок с камеры " + camera.name} referrerPolicy="no-referrer" className={view.loaded ? "" : "snapshot-pending"}
        onLoad={() => { if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current); setView((state) => state.status === "image" ? { ...state, loaded: true } : state); onStatus({ status: "working", checkedAt: new Date().toISOString(), sourceTime: view.snapshot.sourceTime }); }}
        onError={() => { if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current); setView({ status: "error" }); onStatus({ status: "unavailable", checkedAt: new Date().toISOString() }); }} />}
      {view.status === "empty" && <p role="status">{t("snapshotEmpty")}</p>}
      {view.status === "error" && <p role="alert">{t("snapshotError")}</p>}
    </div>
    <footer className="snapshot-footer">
      <div>{view.status === "image" && view.loaded && <p className="snapshot-time">{t("timeIts")}: <time dateTime={view.snapshot.sourceTime}>{new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Warsaw" }).format(new Date(view.snapshot.sourceTime))}</time> · Opole</p>}<p className="snapshot-note">{t("latestSnapshot")}</p></div>
      <div className="snapshot-actions"><button className="utility-button" disabled={loading} onClick={retry}>{view.status === "error" ? t("retry") : t("refresh")}</button><a href={camera.publicViewUrl ?? "https://its.mzd.opole.pl/mapa"} target="_blank" rel="noopener noreferrer">{t("openIts")} ↗</a></div>
    </footer>
  </dialog>;
}
