"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { categoryLabels, filterCameras, type Camera, type CameraCategory } from "@/lib/camera";
import CameraDetails from "./CameraDetails";
import Icon from "./Icon";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false, loading: () => <div className="map-loading" role="status">Загружаем карту Opole…</div>,
});

export default function CameraMap({ cameras }: { cameras: Camera[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CameraCategory | "all">("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(cameras[0]?.id ?? null);
  const [is3D, setIs3D] = useState(false);
  const [showSectors, setShowSectors] = useState(true);
  const [resetRequest, setResetRequest] = useState(0);
  const [focusRequest, setFocusRequest] = useState(0);
  const [mobileList, setMobileList] = useState(false);
  const listButtonRef = useRef<HTMLButtonElement>(null);
  const [pageSize, setPageSize] = useState(50);
  const visible = useMemo(() => filterCameras(cameras, { query, category, verifiedOnly }), [cameras, query, category, verifiedOnly]);
  const selected = visible.find((camera) => camera.id === selectedId) ?? null;
  const selectCamera = useCallback((camera: Camera) => {
    setSelectedId(camera.id);
    setFocusRequest((value) => value + 1);
    setMobileList(false);
    if (window.innerWidth <= 760) requestAnimationFrame(() => document.getElementById("camera-details-title")?.focus());
  }, []);
  function resetFilters() {
    setQuery(""); setCategory("all"); setVerifiedOnly(false); setPageSize(50);
  }
  const verifiedCount = cameras.filter((camera) => camera.verified).length;
  useEffect(() => {
    if (!mobileList) return;
    document.getElementById("camera-search")?.focus();
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") { setMobileList(false); requestAnimationFrame(() => listButtonRef.current?.focus()); }
    }
    function onResize() {
      if (window.innerWidth > 760) setMobileList(false);
    }
    window.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("keydown", onEscape); window.removeEventListener("resize", onResize); };
  }, [mobileList]);

  return (
    <div className="shell">
      <a className="skip-link" href="#camera-search" onClick={() => { if (window.innerWidth <= 760) setMobileList(true); }}>К поиску камер</a>
      <aside className={"sidebar" + (mobileList ? " mobile-open" : "")} aria-label="Каталог камер">
        <header className="brand">
          <span className="brand-icon"><Icon name="camera" /></span>
          <div><p className="eyebrow">ГОРОД В ОБЪЕКТИВЕ</p><h1>Opole<span> / cameras</span></h1></div>
          <button className="icon-button mobile-close" aria-label="Закрыть список" onClick={() => { setMobileList(false); requestAnimationFrame(() => listButtonRef.current?.focus()); }}><Icon name="close" /></button>
        </header>
        <div className="sidebar-intro">
          <p>Публичные камеры на одной карте.</p>
          <div className="catalog-stats"><span><b>{cameras.length}</b> камер</span><span><b>{verifiedCount}</b> точек проверено</span></div>
        </div>
        <div className="filters">
          <label className="search-field" htmlFor="camera-search"><Icon name="search" />
            <input id="camera-search" type="search" aria-label="Название камеры или улица" placeholder="Название или улица…" value={query} onChange={(event) => { setQuery(event.target.value); setPageSize(50); }} />
          </label>
          <label className="sr-only" htmlFor="camera-category">Тип камеры</label>
          <select id="camera-category" value={category} onChange={(event) => { setCategory(event.target.value as CameraCategory | "all"); setPageSize(50); }}>
            <option value="all">Все типы камер</option>
            <option value="public">Публичный вид</option>
            <option value="its">ITS Opole</option>
            <option value="city">Городской мониторинг</option>
          </select>
          <label className="check-row"><input type="checkbox" checked={verifiedOnly} onChange={(event) => { setVerifiedOnly(event.target.checked); setPageSize(50); }} /> Только проверенные точки</label>
        </div>
        <div className="list-heading"><span>КАМЕРЫ</span><span aria-live="polite">{visible.length} из {cameras.length}</span></div>
        <div className="camera-list">
          {visible.slice(0, pageSize).map((camera) => (
            <button key={camera.id} className={"camera-item" + (selected?.id === camera.id ? " active" : "")} aria-pressed={selected?.id === camera.id} onClick={() => selectCamera(camera)}>
              <span className="item-camera"><Icon name="camera" /></span>
              <span className="item-copy"><strong>{camera.name}</strong><small>{camera.street}</small><span className="item-type">{categoryLabels[camera.category]} <span aria-hidden="true">·</span> {camera.verified ? "Точка проверена" : "Примерная точка"}</span></span>
              <span className="item-arrow" aria-hidden="true">↗</span>
            </button>
          ))}
          {visible.length > pageSize && <button className="secondary-button" onClick={() => setPageSize((value) => value + 50)}>Показать ещё 50</button>}
          {visible.length === 0 && <div className="empty-state" role="status"><Icon name="search" /><h2>Камеры не найдены</h2><p>{verifiedOnly ? "Проверенных точек для этих условий пока нет." : "Попробуйте другую улицу или тип камеры."}</p><button className="secondary-button" onClick={resetFilters}>Сбросить фильтры</button></div>}
        </div>
        <footer className="sidebar-footer"><span className="small-dot" /> Только публичные источники<a href="https://its.mzd.opole.pl/mapa" target="_blank" rel="noopener noreferrer">Портал ITS Opole ↗</a></footer>
      </aside>

      <main className="map-workspace" aria-label="Карта камер Opole" inert={mobileList}>
        <MapCanvas cameras={visible} selected={selected} onSelect={selectCamera} is3D={is3D} showSectors={showSectors} resetRequest={resetRequest} focusRequest={focusRequest} />
        <div className="map-topbar">
          <div className="location-chip"><Icon name="pin" /><div><strong>Opole</strong><span>Польша · {visible.length} камер</span></div></div>
          <div className="map-actions">
            <div className="mode-switch" role="group" aria-label="Режим карты"><button aria-pressed={!is3D} onClick={() => setIs3D(false)}>2D</button><button aria-pressed={is3D} onClick={() => setIs3D(true)} title="Наклон карты без объёмных зданий">3D</button></div>
            <button className="icon-button center-button" title="В центр Opole" aria-label="В центр Opole" onClick={() => setResetRequest((value) => value + 1)}><Icon name="center" /></button>
          </div>
        </div>
        <div className="map-bottom-tools">
          <button className="sector-toggle" aria-pressed={showSectors} onClick={() => setShowSectors((value) => !value)}><Icon name="sector" /> Секторы обзора <span>{showSectors ? "Вкл" : "Выкл"}</span></button>
          <span className="map-caption">{is3D ? "3D · наклон карты, без объёмных зданий" : "2D · вид сверху"}</span>
        </div>
        {selected && <CameraDetails camera={selected} onClose={() => setSelectedId(null)} />}
        <button ref={listButtonRef} className="mobile-list-button" onClick={() => setMobileList(true)}><Icon name="list" /> Камеры и поиск <span>{visible.length}</span></button>
      </main>
    </div>
  );
}
