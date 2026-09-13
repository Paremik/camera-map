"use client";

import { useEffect, useMemo, useState } from "react";
import type { Camera } from "@/lib/camera";
import { cameraFreshness, catalogQuality, type FreshnessStatus } from "@/lib/catalog-governance";
import Icon from "./Icon";

type Proposal = { id: string; createdAt: string; cameraId: string; latitude: string; longitude: string; status: FreshnessStatus; note: string; state: "pending" };
const proposalKey = "opole-camera-map:verification-proposals:v1";

function readProposals(): Proposal[] {
  try { const value = JSON.parse(localStorage.getItem(proposalKey) ?? "[]"); return Array.isArray(value) ? value.filter(item => item && item.state === "pending") : []; } catch { return []; }
}
function download(name: string, value: unknown) { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 0); }
function percent(value: number, total: number) { return total ? Math.round(value / total * 100) : 0; }

export default function CatalogGovernancePanel({ cameras, onSelect, highContrast, onHighContrast }: { cameras: Camera[]; onSelect: (camera: Camera) => void; highContrast: boolean; onHighContrast: () => void }) {
  const quality = useMemo(() => catalogQuality(cameras), [cameras]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [cameraId, setCameraId] = useState(cameras[0]?.id ?? "");
  const [latitude, setLatitude] = useState(""); const [longitude, setLongitude] = useState(""); const [status, setStatus] = useState<FreshnessStatus>("review"); const [note, setNote] = useState("");
  useEffect(() => setProposals(readProposals()), []);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const selected = cameras.find(camera => camera.id === cameraId); if (!selected) return;
    const lat = latitude.trim() ? Number(latitude) : selected.lat; const lng = longitude.trim() ? Number(longitude) : selected.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 50.5 || lat > 50.85 || lng < 17.7 || lng > 18.15 || note.trim().length < 8) return;
    const next = [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), cameraId, latitude: String(lat), longitude: String(lng), status, note: note.trim().slice(0, 1000), state: "pending" as const }, ...proposals];
    setProposals(next); try { localStorage.setItem(proposalKey, JSON.stringify(next)); } catch { /* The proposal remains visible until this tab closes. */ }
    setLatitude(""); setLongitude(""); setNote("");
  }
  return <details className="governance-panel">
    <summary><Icon name="shield" /> Качество и проверка данных <span>{quality.needsReview.length} требуют проверки</span></summary>
    <div className="governance-body">
      <section><h3>Актуальность записи</h3><p>«Подтверждена» означает независимую проверку координат. Наличие ссылки или снимка само по себе этого статуса не даёт.</p><div className="quality-grid">{[["Координаты", quality.coordinates], ["Направление и сектор", quality.direction], ["Источник", quality.source], ["Дата проверки", quality.reviewed]].map(([label, value]) => <div key={String(label)}><b>{percent(Number(value), quality.total)}%</b><span>{label}</span></div>)}</div></section>
      <section><h3>Предложить исправление</h3><p>Предложение не меняет публичную карту. Оно остаётся в очереди этого браузера, пока модератор не экспортирует и не рассмотрит его.</p><form className="proposal-form" onSubmit={submit}><label>Запись<select value={cameraId} onChange={event => setCameraId(event.target.value)}>{cameras.slice(0, 500).map(camera => <option key={camera.id} value={camera.id}>{camera.name}</option>)}</select></label><div><label>Широта<input inputMode="decimal" value={latitude} onChange={event => setLatitude(event.target.value)} placeholder="Без изменения" /></label><label>Долгота<input inputMode="decimal" value={longitude} onChange={event => setLongitude(event.target.value)} placeholder="Без изменения" /></label></div><label>Предлагаемый статус<select value={status} onChange={event => setStatus(event.target.value as FreshnessStatus)}><option value="review">Требует проверки</option><option value="confirmed">Подтверждена</option></select></label><label>Источник и пояснение<input required minLength={8} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} placeholder="Ссылка на публичный источник или описание наблюдения" /></label><button>Добавить в очередь модерации</button></form>{proposals.length > 0 && <div className="proposal-queue"><b>В очереди: {proposals.length}</b><button type="button" onClick={() => download("opole-camera-verification-queue.json", proposals)}>Скачать очередь JSON</button></div>}</section>
      <section><h3>История и версии</h3><p>Для каждой записи хранится происхождение данных и дата исходного снимка. Сравнение импорта выполняется перед заменой каталога в GitHub Actions; публичная карта не удаляет и не переписывает записи автоматически.</p><div className="review-list">{quality.needsReview.slice(0, 5).map(camera => { const freshness = cameraFreshness(camera); return <button key={camera.id} onClick={() => onSelect(camera)}><strong>{camera.name}</strong><span>{freshness.reviewedAt ?? "дата не опубликована"} · {freshness.source}</span></button>; })}</div></section>
      <section><h3>Открытые данные и аналитика</h3><p><a href="/api/catalog" target="_blank">JSON API</a> · <a href="/api/catalog?format=geojson" target="_blank">GeoJSON API</a>. API отдаёт источник, статус актуальности и лицензионное примечание для каждой записи.</p><p>Наиболее плотные ячейки каталога: {quality.density.map(area => `${area.label} (${area.count})`).join(", ") || "нет данных"}. Это плотность записей, а не доказательство реального покрытия.</p></section>
      <section><h3>Доступность и конфиденциальность</h3><button aria-pressed={highContrast} onClick={onHighContrast}>Контрастный режим: {highContrast ? "включён" : "выключен"}</button><button onClick={() => { try { localStorage.removeItem(proposalKey); localStorage.removeItem("opole-camera-map:admin-drafts:v1"); } catch { /* Nothing else to erase. */ } setProposals([]); }}>Быстро удалить локальные предложения и черновики</button><p>Уведомления PWA не включаются без явного разрешения и серверного канала доставки. Карта не отправляет в фоне данные о происшествии или избранном.</p></section>
    </div>
  </details>;
}
