"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { countCameras, countDocumentedSites, filterCameras, type Camera, type CameraCategory } from "@/lib/camera";
import { cameraLink, readCameraLink } from "@/lib/camera-preferences";
import CameraDetails from "./CameraDetails";
import Icon from "./Icon";
import { useFavorites } from "./useFavorites";
import SourceOverview from "./SourceOverview";
import CameraViewAction from "./CameraViewAction";
import CameraSnapshotViewer from "./CameraSnapshotViewer";
import StreetSearch from "./StreetSearch";
import type { StreetHighlight } from "@/lib/street-search";
import { I18nProvider, languages, useI18n, type Locale } from "@/lib/i18n";
import { cameraLayer, cameraLayers, type CameraAvailability, type CameraLayer } from "@/lib/map-features";
import AppInstall from "./AppInstall";
import CameraStatusBadge from "./CameraStatusBadge";
import AnalysisPanel from "./AnalysisPanel";
import { mapShareLink, readMapShareState, type MapView } from "@/lib/map-state";
import type { AnalysisMode, AnalysisSelection, LngLat } from "@/lib/map-analysis";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false, loading: () => <div className="map-loading" role="status">Загружаем карту Opole…</div>,
});

function updateCameraUrl(id: string | null, replace = false) {
  const url = cameraLink(window.location.href, id);
  if (url !== window.location.href) window.history[replace ? "replaceState" : "pushState"](null, "", url);
}

function CameraMapInner({ cameras }: { cameras: Camera[] }) {
  const { locale, setLocale, t } = useI18n();
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
  const [snapshotCamera, setSnapshotCamera] = useState<Camera | null>(null);
  const [street, setStreet] = useState<StreetHighlight | null>(null);
  const [streetFocusRequest, setStreetFocusRequest] = useState(0);
  const [enabledLayers, setEnabledLayers] = useState<Set<CameraLayer>>(() => new Set(cameraLayers));
  const [mapTheme, setMapTheme] = useState<"light" | "dark">("light");
  const [coverageMode, setCoverageMode] = useState(false);
  const [availability, setAvailability] = useState<Record<string, CameraAvailability>>({});
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("none");
  const [analysisPoints, setAnalysisPoints] = useState<LngLat[]>([]);
  const [mapView, setMapView] = useState<MapView>({ lng: 17.9224, lat: 50.66855, zoom: 15.3, bearing: 0, pitch: 0 });
  const [viewRequest, setViewRequest] = useState<{ id: number; view: MapView } | null>(null);
  const listButtonRef = useRef<HTMLButtonElement>(null);
  const [pageSize, setPageSize] = useState(50);
  const visible = useMemo(() => filterCameras(cameras, { query, category, verifiedOnly }).filter((camera) => enabledLayers.has(cameraLayer(camera)) && (!favoritesOnly || favoriteIds.has(camera.id))), [cameras, query, category, verifiedOnly, enabledLayers, favoritesOnly, favoriteIds]);
  const selected = visible.find((camera) => camera.id === selectedId) ?? null;
  const totalCount = countCameras(cameras);
  const visibleCount = countCameras(visible);
  const totalSites = countDocumentedSites(cameras);
  const visibleSites = countDocumentedSites(visible);
  const reportedCount = countCameras(cameras.filter((camera) => camera.sourceKind === "user-report"));
  const visibleReports = visible.some((camera) => camera.sourceKind === "user-report");
  const coverageHasOptics = visible.some(camera => camera.heading !== null && camera.fov !== null && camera.rangeMeters !== null);
  const analysisSelection: AnalysisSelection | null = analysisMode !== "none" && analysisPoints.length === 2 ? { mode: analysisMode, points: [analysisPoints[0], analysisPoints[1]] } : null;
  const layerCounts = useMemo(() => Object.fromEntries(cameraLayers.map(layer => [layer, cameras.filter(camera => cameraLayer(camera) === layer).length])) as Record<CameraLayer, number>, [cameras]);
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
  function showStreet(result: StreetHighlight) {
    setStreet(result);
    setStreetFocusRequest(value => value + 1);
    setSelectedId(null);
    setInvalidLink(false);
    updateCameraUrl(null, true);
    setMobileList(false);
  }
  const verifiedCount = countCameras(cameras.filter((camera) => camera.verified));
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("opole-camera-map:map-theme"); } catch { /* Keep the light map when storage is blocked. */ }
    if (saved === "dark") setMapTheme("dark");
  }, []);
  useEffect(() => {
    let cancelled = false;
    async function navigate() {
      const link = readCameraLink(window.location.search, knownIds);
      const shared = readMapShareState(window.location.search);
      resetFilters();
      setSelectedId(link.id);
      setInvalidLink(link.invalid);
      setMobileList(false);
      setSnapshotCamera(null);
      if (link.id) setFocusRequest((value) => value + 1);
      if (shared.layers) setEnabledLayers(shared.layers);
      if (shared.theme) changeTheme(shared.theme);
      setCoverageMode(shared.coverage);
      setIs3D(shared.is3D);
      if (shared.view) requestView(shared.view);
      if (!shared.street) setStreet(null);
      else try {
        const response = await fetch("/api/streets?q=" + encodeURIComponent(shared.street), { credentials: "same-origin" });
        if (response.ok && !cancelled) { setStreet(await response.json() as StreetHighlight); setStreetFocusRequest(value => value + 1); }
      } catch { /* The rest of a shared map remains usable if street lookup is offline. */ }
    }
    void navigate();
    const listener = () => void navigate();
    window.addEventListener("popstate", listener);
    return () => { cancelled = true; window.removeEventListener("popstate", listener); };
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
  function changeTheme(theme: "light" | "dark") { setMapTheme(theme); try { localStorage.setItem("opole-camera-map:map-theme", theme); } catch { /* Theme still works for this tab. */ } }
  function requestView(view: MapView) { setMapView(view); setIs3D(view.pitch > 0); setViewRequest(current => ({ id: (current?.id ?? 0) + 1, view })); }
  function addAnalysisPoint(point: LngLat) { setAnalysisPoints(current => current.length >= 2 ? [point] : [...current, point]); }
  function changeAnalysisMode(mode: AnalysisMode) { setAnalysisMode(mode); setAnalysisPoints([]); }
  async function shareMap() {
    const url = mapShareLink(window.location.href, { cameraId: selectedId, layers: enabledLayers, is3D, theme: mapTheme, coverage: coverageMode, street: street?.name ?? null, view: mapView });
    try { await navigator.clipboard.writeText(url); return true; } catch { window.prompt(t("copyError"), url); return false; }
  }
  function toggleLayer(layer: CameraLayer) { setEnabledLayers(current => { const next = new Set(current); if (next.has(layer)) next.delete(layer); else next.add(layer); return next; }); setPageSize(50); }
  function updateAvailability(camera: Camera, value: CameraAvailability) { setAvailability(current => ({ ...current, [camera.id]: value })); }
  function categoryName(camera: Camera) { return camera.category === "its" ? "ITS Opole" : t(camera.category === "public" ? "layerPublic" : camera.category === "city" ? "layerCity" : camera.category === "private" ? "layerPrivate" : "layerOther"); }

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;
      if (document.querySelector("dialog[open]")) return;
      const key = event.key.toLowerCase();
      if (key === "f") void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
      if (key === "r") setResetRequest(value => value + 1);
      if (key === "c") setCoverageMode(value => !value);
      if (key === "a") changeAnalysisMode("area");
      if (key === "t") changeAnalysisMode("route");
      if (event.key === "Escape" && selectedId) closeCamera();
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [selectedId]);

  return (
    <div className="shell">
      <a className="skip-link" href="#camera-search" onClick={() => { if (window.innerWidth <= 760) setMobileList(true); }}>{t("skipSearch")}</a>
      <aside className={"sidebar" + (mobileList ? " mobile-open" : "")} aria-label={t("catalogLabel")}>
        <header className="brand">
          <span className="brand-icon"><Icon name="camera" /></span>
          <div><p className="eyebrow">{t("cityLens")}</p><h1>Opole<span> / cameras</span></h1></div>
          <button className="icon-button mobile-close" aria-label={t("closeList")} onClick={() => { setMobileList(false); requestAnimationFrame(() => listButtonRef.current?.focus()); }}><Icon name="close" /></button>
        </header>
        <div className="sidebar-intro">
          <p>{t("cityMap")}</p>
          <div className="catalog-stats"><span><b>{totalCount}</b> {t("cameras")}</span><span><b>{totalSites}</b> {t("objects")}</span></div>
          <p className="catalog-explanation">{t("catalogExplanation")} {verifiedCount}.</p>
          {reportedCount > 0 && <p className="catalog-provenance">{t("reportedPrefix")} {reportedCount}</p>}
          <SourceOverview cameras={cameras} />
        </div>
        <div className="experience-tools"><label><span>{t("language")}</span><select aria-label={t("language")} value={locale} onChange={event => setLocale(event.target.value as Locale)}>{Object.entries(languages).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label><div><span>{t("mapTheme")}</span><button aria-pressed={mapTheme === "light"} onClick={() => changeTheme("light")}>{t("light")}</button><button aria-pressed={mapTheme === "dark"} onClick={() => changeTheme("dark")}>{t("dark")}</button></div><AppInstall /></div>
        <StreetSearch street={street} onFound={showStreet} onClear={() => setStreet(null)} />
        <AnalysisPanel cameras={visible} catalog={cameras} mode={analysisMode} selection={analysisSelection} view={mapView} onMode={changeAnalysisMode} onClear={() => { setAnalysisMode("none"); setAnalysisPoints([]); }} onPreset={requestView} onSelect={selectCamera} onSnapshot={setSnapshotCamera} onShare={shareMap} />
        <div className="filters">
          <label className="search-field" htmlFor="camera-search"><Icon name="search" />
            <input id="camera-search" type="search" aria-label={t("cameraSearchLabel")} placeholder={t("cameraSearch")} value={query} onChange={(event) => { setQuery(event.target.value); setPageSize(50); }} />
          </label>
          <label className="sr-only" htmlFor="camera-category">{t("cameraType")}</label>
          <select id="camera-category" value={category} onChange={(event) => { setCategory(event.target.value as CameraCategory | "all"); setPageSize(50); }}>
            <option value="all">{t("allTypes")}</option>
            <option value="public">{t("layerPublic")}</option>
            <option value="its">ITS Opole</option>
            <option value="city">{t("layerCity")}</option>
            <option value="private">{t("layerPrivate")}</option>
            <option value="other">{t("layerOther")}</option>
          </select>
          <label className="check-row"><input type="checkbox" checked={verifiedOnly} onChange={(event) => { setVerifiedOnly(event.target.checked); setPageSize(50); }} /> {t("verifiedOnly")}</label>
          <details className="layer-filter"><summary>{t("layers")}</summary><div>{cameraLayers.map(layer => <label key={layer}><input type="checkbox" checked={enabledLayers.has(layer)} onChange={() => toggleLayer(layer)} /><span>{t("layer" + layer[0].toUpperCase() + layer.slice(1))}</span><b>{layerCounts[layer]}</b></label>)}</div></details>
          <div className="catalog-switch" role="group" aria-label={t("catalogOrFavorites")}>
            <button aria-pressed={!favoritesOnly} onClick={() => { setFavoritesOnly(false); setPageSize(50); }}>{t("allCameras")}</button>
            <button aria-pressed={favoritesOnly} disabled={!favorites.ready} onClick={() => { setFavoritesOnly(true); setPageSize(50); }}><Icon name="star" /> {t("favorites")} <span>{favorites.ids.length}</span></button>
          </div>
          {favoritesOnly && <p className="favorites-note">{t("favoriteLocal")}</p>}
          {favorites.storageError && <p className="storage-warning" role="status">{t("storageWarning")}</p>}
        </div>
        <div className="list-heading"><span>{t("records")}</span><span aria-live="polite">{visible.length} {t("of")} {cameras.length}</span></div>
        <div className="camera-list">
          {visible.slice(0, pageSize).map((camera) => (
            <div key={camera.id} className={"camera-row" + (selected?.id === camera.id ? " active" : "") + (camera.sourceKind === "user-report" ? " reported" : "")}>
            <button className="camera-item" aria-pressed={selected?.id === camera.id} onClick={() => selectCamera(camera)}>
              <span className="item-camera"><Icon name="camera" /></span>
              <span className="item-copy"><strong>{camera.name}</strong><small>{camera.street}</small><span className="item-type">{categoryName(camera)}</span><CameraStatusBadge value={availability[camera.id]} compact />{camera.reportedCount && <span className="report-count">{t("groupCount")} {camera.reportedCount}</span>}{camera.recordKind === "site" && <span className="object-count">{camera.cameraCount === null ? t("objectUnknown") : t("sourceCount") + " " + camera.cameraCount + " " + t("cameras")}{camera.sourceDate && " · " + camera.sourceDate.slice(0, 4)}</span>}</span>
            </button>
            <button className="icon-button favorite-button row-favorite" disabled={!favorites.ready} aria-label={(favoriteIds.has(camera.id) ? t("favoriteRemove") : t("favoriteAdd")) + ": " + camera.name} aria-pressed={favoriteIds.has(camera.id)} onClick={() => favorites.toggle(camera.id)}><Icon name="star" /></button>
            <CameraViewAction camera={camera} onSnapshot={setSnapshotCamera} compact />
            </div>
          ))}
          {visible.length > pageSize && <button className="secondary-button" onClick={() => setPageSize((value) => value + 50)}>{t("showMore")}</button>}
          {visible.length === 0 && <div className="empty-state" role="status"><Icon name={favoritesOnly ? "star" : "search"} /><h2>{favoritesOnly && favorites.ids.length === 0 ? t("emptyFavorites") : t("noCameras")}</h2><p>{favoritesOnly && favorites.ids.length === 0 ? t("favoriteHint") : verifiedOnly ? t("verifiedEmpty") : t("tryOther")}</p><button className="secondary-button" onClick={resetFilters}>{favoritesOnly && favorites.ids.length === 0 ? t("showAll") : t("resetFilters")}</button></div>}
        </div>
        <footer className="sidebar-footer"><span className="small-dot" /> {t("publicFooter")}<a href="https://its.mzd.opole.pl/mapa" target="_blank" rel="noopener noreferrer">ITS Opole ↗</a></footer>
      </aside>

      <main className="map-workspace" aria-label={t("mapLabel")} inert={mobileList}>
        <MapCanvas cameras={visible} selected={selected} onSelect={selectCamera} is3D={is3D} showSectors={showSectors} resetRequest={resetRequest} focusRequest={focusRequest} street={street} streetFocusRequest={streetFocusRequest} mapTheme={mapTheme} coverageMode={coverageMode} analysisMode={analysisMode} analysisPoints={analysisPoints} onAnalysisPoint={addAnalysisPoint} initialView={null} viewRequest={viewRequest} onViewChange={setMapView} />
        <div className="map-topbar">
          <div className="location-chip"><Icon name="pin" /><div><strong>Opole</strong><span>{visibleCount} {t("cameras")} · {visibleSites} {t("objects")}</span></div></div>
          <div className="map-actions">
            <div className="mode-switch" role="group" aria-label={t("mapMode")}><button aria-pressed={!is3D} onClick={() => setIs3D(false)}>2D</button><button aria-pressed={is3D} onClick={() => setIs3D(true)} title={t("tiltTitle")}>3D</button></div>
            <button className="icon-button center-button" title={t("centerMap")} aria-label={t("centerMap")} onClick={() => setResetRequest((value) => value + 1)}><Icon name="center" /></button>
          </div>
        </div>
        {invalidLink && <div className="link-notice" role="status"><p>{t("invalidLink")}</p><button className="secondary-button" onClick={() => { setInvalidLink(false); updateCameraUrl(null, true); }}>{t("understood")}</button></div>}
        <div className="map-bottom-tools">
          <button className="sector-toggle" aria-pressed={showSectors} onClick={() => setShowSectors((value) => !value)}><Icon name="sector" /> {t("sectors")} <span>{showSectors ? t("enabled") : t("disabled")}</span></button>
          <button className="sector-toggle coverage-toggle" aria-pressed={coverageMode} onClick={() => setCoverageMode(value => !value)}>{t("coverage")} <span>{coverageMode ? t("coverageOn") : "—"}</span></button>
          <span className="map-caption">{is3D ? t("viewTilt") : t("viewTop")}</span>
          {visibleReports && <span className="map-caption reported-caption">{t("userOrange")}</span>}
          {visibleSites > 0 && <span className="map-caption object-caption">{t("objectMarker")}</span>}
          {street && <span className="map-caption street-caption"><i /> {t("streetMarked")} {street.name}<button aria-label={t("removeStreet")} onClick={() => setStreet(null)}>×</button></span>}
          {coverageMode && (coverageHasOptics ? <><span className="map-caption coverage-known">{t("coverageKnown")}</span><span className="map-caption coverage-unknown">{t("coverageUnknown")}</span></> : <span className="map-caption coverage-unknown">{t("coverageNone")}</span>)}
        </div>
        {selected && <CameraDetails key={selected.id} camera={selected} availability={availability[selected.id]} onClose={closeCamera} favorite={favoriteIds.has(selected.id)} favoritesReady={favorites.ready} onToggleFavorite={() => favorites.toggle(selected.id)} onSnapshot={setSnapshotCamera} />}
        <button ref={listButtonRef} className="mobile-list-button" onClick={() => setMobileList(true)}><Icon name="list" /> {t("camerasAndSearch")} <span>{visible.length}</span></button>
      </main>
      {snapshotCamera && <CameraSnapshotViewer key={snapshotCamera.id} camera={snapshotCamera} onStatus={value => updateAvailability(snapshotCamera, value)} onClose={() => setSnapshotCamera(null)} />}
    </div>
  );
}

export default function CameraMap({ cameras }: { cameras: Camera[] }) { return <I18nProvider><CameraMapInner cameras={cameras} /></I18nProvider>; }
