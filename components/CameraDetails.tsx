"use client";

import { useState } from "react";
import type { Camera } from "@/lib/camera";
import { categoryLabels } from "@/lib/camera";
import { cameraLink, isLocalLink } from "@/lib/camera-preferences";
import Icon from "./Icon";

type Props = { camera: Camera; onClose: () => void; favorite: boolean; favoritesReady: boolean; onToggleFavorite: () => void };

export default function CameraDetails({ camera, onClose, favorite, favoritesReady, onToggleFavorite }: Props) {
  const [share, setShare] = useState<{ url: string; copied: boolean } | null>(null);
  const [copying, setCopying] = useState(false);
  async function copyLink() {
    const url = cameraLink(window.location.href, camera.id, true);
    setCopying(true);
    try {
      await navigator.clipboard.writeText(url);
      setShare({ url, copied: true });
    } catch {
      setShare({ url, copied: false });
    } finally { setCopying(false); }
  }
  const approximate = camera.opticsVerified ? "" : "≈";
  return (
    <section className="details-card" aria-labelledby="camera-details-title" data-camera-id={camera.id}>
      <div className="details-heading"><span className="eyebrow">ВЫБРАННАЯ КАМЕРА</span><button className="icon-button" aria-label="Закрыть карточку камеры" onClick={onClose}><Icon name="close" /></button></div>
      <div className="details-scroll">
      <div className="details-type"><Icon name="camera" /> {categoryLabels[camera.category]}</div>
      <h2 id="camera-details-title" tabIndex={-1}>{camera.name}</h2>
      <p className="details-location"><Icon name="pin" /> {camera.street}</p>
      <div className="camera-actions">
        <button className="utility-button favorite-button" aria-pressed={favorite} disabled={!favoritesReady} onClick={onToggleFavorite}><Icon name="star" /> {favorite ? "В избранном" : "В избранное"}</button>
        <button className="utility-button" disabled={copying} onClick={copyLink}><Icon name="link" /> {copying ? "Копируем…" : "Ссылка"}</button>
      </div>
      {share && <div className="share-result">
        <p role="status">{share.copied ? "Ссылка скопирована." : "Не удалось скопировать. Выделите ссылку и скопируйте её вручную."}{isLocalLink(share.url) && " Локальная ссылка работает только на этом компьютере."}</p>
        {!share.copied && <input className="share-url" aria-label="Ссылка на камеру" readOnly value={share.url} onFocus={(event) => event.target.select()} />}
      </div>}
      <p className={"verification-badge" + (camera.verified ? " verified" : "")}>{camera.verified ? "✓ Координаты проверены" : "○ Координаты не проверены"}</p>
      <div className="view-parameters">
        <div className="bearing-diagram" aria-hidden="true"><span>N</span><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="29" /><path d="M40 5v7M40 68v7M5 40h7M68 40h7" />{camera.heading !== null && <g transform={"rotate(" + camera.heading + " 40 40)"}><path className="bearing-cone" d="M40 40 23 14Q40 3 57 14Z" /><path className="bearing-arrow" d="M40 45V15m-5 7 5-7 5 7" /></g>}<circle className="bearing-origin" cx="40" cy="40" r="3" /></svg></div>
        <dl className="optics-grid">
          <div><dt>Направление</dt><dd>{camera.heading === null ? "Нет данных" : approximate + camera.heading + "°"}</dd></div>
          <div><dt>Угол обзора</dt><dd>{camera.fov === null ? "Нет данных" : approximate + camera.fov + "°"}</dd></div>
          <div><dt>Дальность</dt><dd>{camera.rangeMeters === null ? "Нет данных" : approximate + camera.rangeMeters + " м"}</dd></div>
        </dl>
      </div>
      <p className="optics-note">{camera.heading === null || camera.fov === null || camera.rangeMeters === null ? "Сектор не построен: в источнике недостаточно данных об оптике." : camera.opticsVerified ? "Оптика подтверждена публичным техническим источником." : "Сектор — иллюстрация, а не точное покрытие камеры."}</p>
      <dl className="source-details"><div><dt>Координаты · широта, долгота</dt><dd>{camera.lat.toFixed(5)}, {camera.lng.toFixed(5)}</dd></div><div><dt>Источник</dt><dd><a href={camera.sourceUrl} target="_blank" rel="noopener noreferrer">{camera.sourceLabel} ↗</a></dd></div></dl>
      {camera.positionSourceUrl && <p className="position-source"><a href={camera.positionSourceUrl} target="_blank" rel="noopener noreferrer">Положение здания · OpenStreetMap ↗</a></p>}
      {camera.note && <p className="camera-note">{camera.note}</p>}
      </div>
      {camera.publicViewUrl ? <a href={camera.publicViewUrl} target="_blank" rel="noopener noreferrer" className="view-button">{camera.publicViewUrl === "https://its.mzd.opole.pl/mapa" ? "Открыть карту ITS" : "Открыть публичный вид"} <span aria-hidden="true">↗</span></a> : <p className="no-stream">Публичный просмотр не указан источником.</p>}
    </section>
  );
}
