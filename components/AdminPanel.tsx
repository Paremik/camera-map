"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Camera } from "@/lib/camera";
import { adminDraftExport, type CameraAdminDrafts, type CameraAdminPatch } from "@/lib/admin-drafts";
import { useI18n } from "@/lib/i18n";

type Props = {
  cameras: Camera[]; drafts: CameraAdminDrafts; open: boolean; initialId: string | null;
  onClose: () => void; onSave: (id: string, patch: CameraAdminPatch) => void;
  onDelete: (id: string) => void; onClear: () => void; onSelect: (camera: Camera) => void;
};

function downloadDrafts(drafts: CameraAdminDrafts) {
  const url = URL.createObjectURL(new Blob([adminDraftExport(drafts)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = "opole-camera-admin-drafts.json"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function nullableNumber(data: FormData, key: string) {
  const raw = String(data.get(key) ?? "").trim();
  return raw === "" ? null : Number(raw);
}

export default function AdminPanel(props: Props) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [draftsOnly, setDraftsOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(props.initialId ?? props.cameras[0]?.id ?? null);
  const [notice, setNotice] = useState("");
  const [auth, setAuth] = useState<"loading" | "locked" | "open" | "unconfigured">("loading");
  const [password, setPassword] = useState("");
  const selected = props.cameras.find(camera => camera.id === selectedId) ?? null;
  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return props.cameras.filter(camera => (!term || (camera.name + " " + camera.street + " " + camera.id).toLocaleLowerCase().includes(term)) && (!draftsOnly || Boolean(props.drafts[camera.id]))).slice(0, 80);
  }, [props.cameras, query, draftsOnly, props.drafts]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (props.open && !dialog.open) dialog.showModal();
    if (!props.open && dialog.open) dialog.close();
  }, [props.open]);
  useEffect(() => { if (props.open && props.initialId) setSelectedId(props.initialId); }, [props.open, props.initialId]);
  useEffect(() => {
    if (!props.open) return;
    let active = true;
    void fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" }).then(async response => {
      const result = await response.json() as { configured?: boolean; authorized?: boolean };
      if (active) setAuth(result.authorized ? "open" : result.configured ? "locked" : "unconfigured");
    }).catch(() => { if (active) setAuth("locked"); });
    return () => { active = false; };
  }, [props.open]);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice("");
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ password }) });
      const result = await response.json() as { authorized?: boolean; error?: string };
      if (result.authorized) { setAuth("open"); setPassword(""); } else setNotice(result.error ?? "Не удалось открыть панель.");
    } catch { setNotice("Не удалось проверить доступ. Попробуйте ещё раз."); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const patch: CameraAdminPatch = {
      name: String(data.get("name") ?? "").trim(), street: String(data.get("street") ?? "").trim(),
      lat: Number(data.get("lat")), lng: Number(data.get("lng")), heading: nullableNumber(data, "heading"),
      fov: nullableNumber(data, "fov"), rangeMeters: nullableNumber(data, "rangeMeters"),
      verified: data.get("verified") === "on", opticsVerified: data.get("opticsVerified") === "on",
      note: String(data.get("note") ?? "").trim(), updatedAt: new Date().toISOString(),
    };
    if (!patch.name || !patch.street || !Number.isFinite(patch.lat) || !Number.isFinite(patch.lng)) { setNotice(t("adminInvalid")); return; }
    if (patch.opticsVerified && (patch.heading === null || patch.fov === null || patch.rangeMeters === null)) { setNotice(t("adminOpticsInvalid")); return; }
    props.onSave(selected.id, patch); setNotice(t("adminSaved"));
  }

  const draftCount = Object.keys(props.drafts).length;
  return <dialog ref={dialogRef} className="admin-dialog" onClose={props.onClose}>
    <header className="admin-header"><div><p className="eyebrow">{auth === "open" ? t("adminWorkspace") : "ЗАЩИЩЁННЫЙ ДОСТУП"}</p><h2>{t("adminTitle")}</h2><p>{auth === "open" ? "Рабочее пространство модератора каталога" : "Панель доступна только авторизованному модератору"}</p></div><div className="admin-header-actions">{auth === "open" && <span>{draftCount} черновиков</span>}<button aria-label={t("adminClose")} onClick={props.onClose}>×</button></div></header>
    {auth !== "open" ? <section className="admin-lock" aria-live="polite">{auth === "loading" ? <p>Проверяем доступ…</p> : auth === "unconfigured" ? <><h3>Доступ не настроен</h3><p>Добавьте <code>ADMIN_PANEL_PASSWORD</code> в локальный файл <code>.env.local</code> или в переменные окружения Vercel. Без этой настройки панель заблокирована.</p></> : <><h3>Вход администратора</h3><p>Введите пароль модератора. Он проверяется на сервере и не сохраняется в браузере.</p><form onSubmit={unlock}><label>Пароль<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} autoFocus /></label>{notice && <p className="admin-auth-error" role="alert">{notice}</p>}<button type="submit">Открыть защищённую панель</button></form></>}</section> : <>
    <p className="admin-scope">{t("adminScope")}</p>
    <div className="admin-layout">
      <aside className="admin-records"><div className="admin-records-heading"><label>{t("adminFind")}<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("adminFindPlaceholder")} /></label><div><span>{results.length} из {props.cameras.length}</span><button type="button" aria-pressed={draftsOnly} onClick={() => setDraftsOnly(value => !value)}>Только черновики</button></div></div><div className="admin-record-list">{results.map(camera => <button key={camera.id} aria-pressed={camera.id === selectedId} onClick={() => { setSelectedId(camera.id); setNotice(""); }}><span className="admin-record-marker">{camera.recordKind === "site" ? "i" : "●"}</span><span><strong>{camera.name}</strong><small>{camera.street}</small></span>{props.drafts[camera.id] && <i>{t("adminDraft")}</i>}</button>)}{results.length === 0 && <p className="admin-empty">Нет записей по этому фильтру.</p>}</div></aside>
      <section className="admin-editor">{selected ? <form key={selected.id + (props.drafts[selected.id]?.updatedAt ?? "base")} onSubmit={submit}>
        <div className="admin-editor-heading"><div><p className="eyebrow">Редактирование записи</p><h3>{selected.name}</h3><span>{props.drafts[selected.id] ? "Изменения сохранены локально" : "Исходная запись каталога"}</span></div><button type="button" onClick={() => props.onSelect(selected)}>{t("adminShowMap")}</button></div>
        <div className="admin-source"><strong>{selected.id}</strong><span>{selected.sourceLabel}</span>{selected.sourceUrl ? <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">{t("adminOpenSource")} ↗</a> : <em>{t("adminNoSource")}</em>}</div>
        <div className="admin-grid"><label>{t("adminName")}<input name="name" required defaultValue={selected.name} /></label><label>{t("adminStreet")}<input name="street" required defaultValue={selected.street} /></label><label>{t("adminLat")}<input name="lat" type="number" step="any" min="49" max="52" required defaultValue={selected.lat} /></label><label>{t("adminLng")}<input name="lng" type="number" step="any" min="14" max="24" required defaultValue={selected.lng} /></label><label>{t("adminHeading")}<input name="heading" type="number" step="any" min="0" max="359.999" defaultValue={selected.heading ?? ""} /></label><label>{t("adminFov")}<input name="fov" type="number" step="any" min="1" max="180" defaultValue={selected.fov ?? ""} /></label><label>{t("adminRange")}<input name="rangeMeters" type="number" step="any" min="1" max="5000" defaultValue={selected.rangeMeters ?? ""} /></label></div>
        <label className="admin-note">{t("adminNote")}<textarea name="note" rows={4} defaultValue={selected.note ?? ""} /></label>
        <div className="admin-checks"><label><input name="verified" type="checkbox" defaultChecked={selected.verified} /> {t("adminVerified")}</label><label><input name="opticsVerified" type="checkbox" defaultChecked={selected.opticsVerified} /> {t("adminOpticsVerified")}</label></div>
        {notice && <p className="admin-notice" role="status">{notice}</p>}
        <div className="admin-form-actions"><button type="submit">{t("adminSave")}</button><button type="button" disabled={!props.drafts[selected.id]} onClick={() => { props.onDelete(selected.id); setNotice(t("adminReverted")); }}>{t("adminRevert")}</button></div>
      </form> : <p>{t("adminNoSelection")}</p>}</section>
    </div>
    <footer className="admin-footer"><span>{draftCount} {t("adminDraftsCount")}</span><button disabled={!draftCount} onClick={() => downloadDrafts(props.drafts)}>{t("adminExport")}</button><button disabled={!draftCount} onClick={props.onClear}>{t("adminClear")}</button></footer></>}
  </dialog>;
}
