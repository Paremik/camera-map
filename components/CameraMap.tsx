"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cameraCategoryLabel, countCameras, filterCameras, type Camera, type CameraCategory } from "@/lib/camera";
import { cameraLink, readCameraLink } from "@/lib/camera-preferences";
import CameraDetails from "./CameraDetails";
import Icon from "./Icon";
import { useFavorites } from "./useFavorites";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false, loading: () => <div className="map-loading" role="status">Загружаем карту Opole…</div>,
});

function updateCameraUrl(id: string | null, replace = false) {
  const url = cameraLink(window.location.href, id);
  if (url !== window.location.href) window.history[replace ? "replaceState" : "pushState"](null, "", url);
}

export default function CameraMap({ cameras }: { cameras: Camera[] }) {
  const knownIds = useMemo(() => new Set(cameras.map((camera) => camera.id)), [cameras]);
  const favorites = useFavorites(knownIds);
  const favoriteIds = useMemo(() => new Set(favorites.ids), [favorites.ids]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CameraCategory | "all">("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [showSectors, setShowSectors] = useState(true);
  const [resetRequest, setResetRequest] = useState(0);
  const [focusRequest, setFocusRequest] = useState(0);
  const [mobileList, setMobileList] = useState(false);
  const listButtonRef = useRef<HTMLButtonElement>(null);
  const [pageSize, setPageSize] = useState(50);
  const visible = useMemo(() => filterCameras(cameras, { query, category, verifiedOnly }).filter((camera) => !favoritesOnly || favoriteIds.has(camera.id)), [cameras, query, category, verifiedOnly, favoritesOnly, favoriteIds]);
  const selected = visible.find((camera) => camera.id === selectedId) ?? null;
  const totalCount = countCameras(cameras);
  const visibleCount = countCameras(visible);
  const reportedCount = countCameras(cameras.filter((camera) => camera.sourceKind === "user-report"));
  const visibleReports = visible.some((camera) => camera.sourceKind === "user-report");
  const selectCamera = useCallback((camera: Camera) => {
    updateCameraUrl(camera.id);
    setInvalidLink(false);
    setSelectedId(camera.id);
    setFocusRequest((value) => value + 1);
    setMobileList(false);
    if (window.innerWidth <= 760) requestAnimationFrame(() => document.getElementById("camera-details-title")?.focus());
  }, []);
  const resetFilters = useCallback(() => {
    setQuery(""); setCategory("all"); setVerifiedOnly(false); setFavoritesOnly(false); setPageSize(50);
  }, []);
  function closeCamera() {
    updateCameraUrl(null);
    setSelectedId(null);
  }
  const verifiedCount = countCameras(cameras.filter((camera) => camera.verified));
  useEffect(() => {
    function navigate() {
      const link = readCameraLink(window.location.search, knownIds);
      resetFilters();
      setSelectedId(link.id);
      setInvalidLink(link.invalid);
      setMobileList(false);
      if (link.id) setFocusRequest((value) => value + 1);
    }
    navigate();
    window.addEventListener("popstate", navigate);
    return () => window.removeEventListener("popstate", navigate);
  }, [knownIds, resetFilters]);
  useEffect(() => {
    if (selectedId && !visible.some((camera) => camera.id === selectedId)) {
      setSelectedId(null);
      updateCameraUrl(null, true);
    }
  }, [selectedId, visible]);
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
          <p>Камеры города на одной карте.</p>
          <div className="catalog-stats"><span><b>{totalCount}</b> камер</span><span><b>{verifiedCount}</b> точек проверено</span></div>
          {reportedCount > 0 && <p className="catalog-provenance">Из них со слов пользователей: {reportedCount}</p>}
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
            <option value="private">Частные камеры</option>
          </select>
          <label className="check-row"><input type="checkbox" checked={verifiedOnly} onChange={(event) => { setVerifiedOnly(event.target.checked); setPageSize(50); }} /> Только проверенные точки</label>
          <div className="catalog-switch" role="group" aria-label="Каталог или избранное">
            <button aria-pressed={!favoritesOnly} onClick={() => { setFavoritesOnly(false); setPageSize(50); }}>Все камеры</button>
            <button aria-pressed={favoritesOnly} disabled={!favorites.ready} onClick={() => { setFavoritesOnly(true); setPageSize(50); }}><Icon name="star" /> Избранное <span>{favorites.ids.length}</span></button>
          </div>
          {favoritesOnly && <p className="favorites-note">Избранное сохраняется в этом браузере.</p>}
          {favorites.storageError && <p className="storage-warning" role="status">Браузер не разрешает сохранять избранное. Оно доступно до закрытия или перезагрузки страницы.</p>}
        </div>
        <div className="list-heading"><span>КАМЕРЫ</span><span aria-live="polite">{visibleCount} из {totalCount}</span></div>
        <div className="camera-list">
          {visible.slice(0, pageSize).map((camera) => (
            <div key={camera.id} className={"camera-row" + (selected?.id === camera.id ? " active" : "") + (camera.sourceKind === "user-report" ? " reported" : "")}>
            <button className="camera-item" aria-pressed={selected?.id === camera.id} onClick={() => selectCamera(camera)}>
              <span className="item-camera"><Icon name="camera" /></span>
              <span className="item-copy"><strong>{camera.name}</strong><small>{camera.street}</small><span className="item-type">{cameraCategoryLabel(camera)} <span aria-hidden="true">·</span> {camera.sourceKind === "user-report" ? "Со слов пользователя" : camera.verified ? "Точка проверена" : "Точка не проверена"}</span>{camera.reportedCount && <span className="report-count">Камер в группе: {camera.reportedCount}</span>}</span>
            </button>
            <button className="icon-button favorite-button row-favorite" disabled={!favorites.ready} aria-label={(favoriteIds.has(camera.id) ? "Убрать из избранного: " : "В избранное: ") + camera.name} aria-pressed={favoriteIds.has(camera.id)} onClick={() => favorites.toggle(camera.id)}><Icon name="star" /></button>
            </div>
          ))}
          {visible.length > pageSize && <button className="secondary-button" onClick={() => setPageSize((value) => value + 50)}>Показать ещё 50</button>}
          {visible.length === 0 && <div className="empty-state" role="status"><Icon name={favoritesOnly ? "star" : "search"} /><h2>{favoritesOnly && favorites.ids.length === 0 ? "В избранном пока пусто" : "Камеры не найдены"}</h2><p>{favoritesOnly && favorites.ids.length === 0 ? "Нажмите звёздочку рядом с камерой, чтобы сохранить её здесь." : verifiedOnly ? "Проверенных точек для этих условий пока нет." : "Попробуйте другую улицу или тип камеры."}</p><button className="secondary-button" onClick={resetFilters}>{favoritesOnly && favorites.ids.length === 0 ? "Показать все камеры" : "Сбросить фильтры"}</button></div>}
        </div>
        <footer className="sidebar-footer"><span className="small-dot" /> Публичные источники и сообщения пользователей<a href="https://its.mzd.opole.pl/mapa" target="_blank" rel="noopener noreferrer">Портал ITS Opole ↗</a></footer>
      </aside>

      <main className="map-workspace" aria-label="Карта камер Opole" inert={mobileList}>
        <MapCanvas cameras={visible} selected={selected} onSelect={selectCamera} is3D={is3D} showSectors={showSectors} resetRequest={resetRequest} focusRequest={focusRequest} />
        <div className="map-topbar">
          <div className="location-chip"><Icon name="pin" /><div><strong>Opole</strong><span>Польша · камер: {visibleCount}</span></div></div>
          <div className="map-actions">
            <div className="mode-switch" role="group" aria-label="Режим карты"><button aria-pressed={!is3D} onClick={() => setIs3D(false)}>2D</button><button aria-pressed={is3D} onClick={() => setIs3D(true)} title="Наклон карты без объёмных зданий">3D</button></div>
            <button className="icon-button center-button" title="В центр Opole" aria-label="В центр Opole" onClick={() => setResetRequest((value) => value + 1)}><Icon name="center" /></button>
          </div>
        </div>
        {invalidLink && <div className="link-notice" role="status"><p>Камера из ссылки не найдена в каталоге. Выберите доступную камеру на карте или в списке.</p><button className="secondary-button" onClick={() => { setInvalidLink(false); updateCameraUrl(null, true); }}>Понятно</button></div>}
        <div className="map-bottom-tools">
          <button className="sector-toggle" aria-pressed={showSectors} onClick={() => setShowSectors((value) => !value)}><Icon name="sector" /> Секторы обзора <span>{showSectors ? "Вкл" : "Выкл"}</span></button>
          <span className="map-caption">{is3D ? "3D · наклон карты, без объёмных зданий" : "2D · вид сверху"}</span>
          {visibleReports && <span className="map-caption reported-caption">Оранжевые точки — со слов пользователя</span>}
        </div>
        {selected && <CameraDetails key={selected.id} camera={selected} onClose={closeCamera} favorite={favoriteIds.has(selected.id)} favoritesReady={favorites.ready} onToggleFavorite={() => favorites.toggle(selected.id)} />}
        <button ref={listButtonRef} className="mobile-list-button" onClick={() => setMobileList(true)}><Icon name="list" /> Камеры и поиск <span>{visibleCount}</span></button>
      </main>
    </div>
  );
}
