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
import InsuranceCasePanel from "./InsuranceCasePanel";
import { mapShareLink, readMapShareState, type MapView } from "@/lib/map-state";
import type { AnalysisMode, AnalysisSelection, LngLat } from "@/lib/map-analysis";
import AdminPanel from "./AdminPanel";
import { adminDraftStorageKey, applyAdminDrafts, parseAdminDrafts, type CameraAdminDrafts, type CameraAdminPatch } from "@/lib/admin-drafts";
import { airspaceMapUrl, droneTowerUrl, droneZoneSourceUrl, epopAtz } from "@/lib/drone-zones";
import type { IncidentKind, IncidentPoint } from "@/lib/insurance-case";
import CatalogGovernancePanel from "./CatalogGovernancePanel";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false, loading: () => <div className="map-loading" role="status">Загружаем карту Opole…</div>,
});

function updateCameraUrl(id: string | null, replace = false) {
  const url = cameraLink(window.location.href, id);
  if (url !== window.location.href) window.history[replace ? "replaceState" : "pushState"](null, "", url);
}

function CameraMapInner({ cameras: sourceCameras }: { cameras: Camera[] }) {
  const { locale, setLocale, t } = useI18n();
  const knownIds = useMemo(() => new Set(sourceCameras.map((camera) => camera.id)), [sourceCameras]);
  const [adminDrafts, setAdminDrafts] = useState<CameraAdminDrafts>({});
  const [adminOpen, setAdminOpen] = useState(false);
  const cameras = useMemo(() => applyAdminDrafts(sourceCameras, adminDrafts), [sourceCameras, adminDrafts]);
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
  const [sidebarTab, setSidebarTab] = useState<"catalog" | "tools">("catalog");
  const [snapshotCamera, setSnapshotCamera] = useState<Camera | null>(null);
  const [street, setStreet] = useState<StreetHighlight | null>(null);
  const [streetFocusRequest, setStreetFocusRequest] = useState(0);
  const [enabledLayers, setEnabledLayers] = useState<Set<CameraLayer>>(() => new Set(cameraLayers));
  const [mapTheme, setMapTheme] = useState<"light" | "dark">("light");
  const [coverageMode, setCoverageMode] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [droneZonesMode, setDroneZonesMode] = useState(false);
  const [droneInfoOpen, setDroneInfoOpen] = useState(false);
  const [streetViewMode, setStreetViewMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [availability, setAvailability] = useState<Record<string, CameraAvailability>>({});
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("none");
  const [analysisPoints, setAnalysisPoints] = useState<LngLat[]>([]);
  const [incidentPoint, setIncidentPoint] = useState<IncidentPoint | null>(null);
  const [incidentPickMode, setIncidentPickMode] = useState(false);
  const [incidentKind, setIncidentKind] = useState<IncidentKind>("crash");
  const [incidentAt, setIncidentAt] = useState("");
  const [mapView, setMapView] = useState<MapView>({ lng: 17.9224, lat: 50.66855, zoom: 15.3, bearing: 0, pitch: 0 });
  const [viewRequest, setViewRequest] = useState<{ id: number; view: MapView } | null>(null);
  const listButtonRef = useRef<HTMLButtonElement>(null);
  const settingsDialogRef = useRef<HTMLDialogElement>(null);
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
  const currentIncident = incidentPoint ? { ...incidentPoint, kind: incidentKind, occurredAt: incidentAt || null } : null;
  const layerCounts = useMemo(() => Object.fromEntries(cameraLayers.map(layer => [layer, cameras.filter(camera => cameraLayer(camera) === layer).length])) as Record<CameraLayer, number>, [cameras]);
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(adminDraftStorageKey); } catch { /* Admin drafts remain available for this tab. */ }
    setAdminDrafts(parseAdminDrafts(saved, knownIds));
  }, [knownIds]);
  function storeAdminDrafts(next: CameraAdminDrafts) {
    setAdminDrafts(next);
    try { localStorage.setItem(adminDraftStorageKey, JSON.stringify(next)); } catch { /* Editing still works until reload. */ }
  }
  function saveAdminDraft(id: string, patch: CameraAdminPatch) { storeAdminDrafts({ ...adminDrafts, [id]: patch }); }
  function deleteAdminDraft(id: string) { const next = { ...adminDrafts }; delete next[id]; storeAdminDrafts(next); }
  function clearAdminDrafts() { storeAdminDrafts({}); }
  const selectCamera = useCallback((camera: Camera) => {
    updateCameraUrl(camera.id);
    setInvalidLink(false);
    setSelectedId(camera.id);
    setFocusRequest((value) => value + 1);
    setDroneInfoOpen(false);
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
  function showDroneZone() {
    if (selectedId) {
      updateCameraUrl(null);
      setSelectedId(null);
    }
    setDroneInfoOpen(true);
  }
  function toggleDroneZones() {
    const next = !droneZonesMode;
    setDroneZonesMode(next);
    setDroneInfoOpen(next);
    if (next && selectedId) {
      updateCameraUrl(null);
      setSelectedId(null);
    }
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
      setHeatmapMode(shared.heatmap);
      setDroneZonesMode(shared.droneZones);
      setDroneInfoOpen(shared.droneZones);
      setIncidentPoint(shared.incident);
      setIncidentKind(shared.incident?.kind ?? "crash");
      setIncidentAt(shared.incident?.occurredAt ?? "");
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
  function beginIncidentPick() { setIncidentPickMode(value => !value); setAnalysisMode("none"); setAnalysisPoints([]); }
  function setIncident(point: IncidentPoint) { setIncidentPoint({ ...point, kind: incidentKind, occurredAt: incidentAt || null }); setIncidentPickMode(false); setSelectedId(null); }
  function openStreetView([lng, lat]: LngLat) {
    const url = new URL("https://www.google.com/maps/@");
    url.searchParams.set("api", "1");
    url.searchParams.set("map_action", "pano");
    url.searchParams.set("viewpoint", `${lat.toFixed(6)},${lng.toFixed(6)}`);
    const panoramaWindow = window.open(url.toString(), "_blank");
    if (panoramaWindow) {
      panoramaWindow.opener = null;
      panoramaWindow.focus();
    } else {
      window.location.assign(url.toString());
    }
    setStreetViewMode(false);
  }
  async function shareMap() {
    const url = mapShareLink(window.location.href, { cameraId: selectedId, layers: enabledLayers, is3D, theme: mapTheme, coverage: coverageMode, heatmap: heatmapMode, droneZones: droneZonesMode, street: street?.name ?? null, incident: currentIncident, view: mapView });
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
      if (key === "d") {
        setDroneZonesMode(value => { setDroneInfoOpen(!value); return !value; });
        if (selectedId) { updateCameraUrl(null); setSelectedId(null); }
      }
      if (key === "a") changeAnalysisMode("area");
      if (key === "t") changeAnalysisMode("route");
      if (event.key === "Escape" && streetViewMode) setStreetViewMode(false);
      else if (event.key === "Escape" && selectedId) closeCamera();
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [selectedId]);

  return (
    <div className={"shell" + (highContrast ? " high-contrast" : "")}>
      <a className="skip-link" href="#camera-search" onClick={() => { if (window.innerWidth <= 760) setMobileList(true); }}>{t("skipSearch")}</a>
      <aside className={"sidebar" + (mobileList ? " mobile-open" : "")} aria-label={t("catalogLabel")}>
        <header className="brand">
          <span className="brand-icon"><Icon name="camera" /></span>
          <div><p className="eyebrow">{t("cityLens")}</p><h1>Opole<span> / cameras</span></h1></div>
          <button className="icon-button mobile-close" aria-label={t("closeList")} onClick={() => { setMobileList(false); requestAnimationFrame(() => listButtonRef.current?.focus()); }}><Icon name="close" /></button>
        </header>
        <nav className="sidebar-navigation" aria-label={t("sidebarNavigation")}>
          <button aria-current={sidebarTab === "catalog" ? "page" : undefined} onClick={() => setSidebarTab("catalog")}><Icon name="camera" />{t("sidebarCatalog")}</button>
          <button aria-current={sidebarTab === "tools" ? "page" : undefined} onClick={() => setSidebarTab("tools")}><Icon name="tools" />{t("sidebarTools")}</button>
        </nav>
        {sidebarTab === "catalog" ? <>
        <section className="user-panel-intro" aria-labelledby="camera-search-title">
          <p className="eyebrow">{t("userPanelEyebrow")}</p>
          <h2 id="camera-search-title">{t("userPanelTitle")}</h2>
          <p>{t("userPanelHint")}</p>
        </section>
        <div className="filters">
          <label className="panel-field-label" htmlFor="camera-search">{t("searchCameras")}</label>
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
        </> : <div className="sidebar-tools">
          <p className="sidebar-tab-hint">{t("sidebarToolsHint")}</p>
        <AnalysisPanel cameras={visible} catalog={cameras} mode={analysisMode} selection={analysisSelection} view={mapView} onMode={changeAnalysisMode} onClear={() => { setAnalysisMode("none"); setAnalysisPoints([]); }} onPreset={requestView} onSelect={selectCamera} onSnapshot={setSnapshotCamera} onShare={shareMap} />
        <InsuranceCasePanel cameras={cameras} point={currentIncident} picking={incidentPickMode} onPick={beginIncidentPick} onClear={() => { setIncidentPoint(null); setIncidentPickMode(false); }} onSelect={selectCamera} incidentKind={incidentKind} incidentAt={incidentAt} onIncidentKind={setIncidentKind} onIncidentAt={setIncidentAt} onShareIncident={shareMap} />
        <CatalogGovernancePanel cameras={cameras} onSelect={selectCamera} highContrast={highContrast} onHighContrast={() => setHighContrast(value => !value)} />
        </div>}
      </aside>

      <main className="map-workspace" aria-label={t("mapLabel")} inert={mobileList}>
        <MapCanvas key={`${mapTheme}-${is3D}`} cameras={visible} selected={selected} onSelect={selectCamera} is3D={is3D} showSectors={showSectors} resetRequest={resetRequest} focusRequest={focusRequest} street={street} streetFocusRequest={streetFocusRequest} mapTheme={mapTheme} coverageMode={coverageMode} heatmapMode={heatmapMode} droneZonesMode={droneZonesMode} droneGeneralLabel={t("droneGeneralMapLabel")} onDroneZoneSelect={showDroneZone} analysisMode={analysisMode} analysisPoints={analysisPoints} onAnalysisPoint={addAnalysisPoint} incidentPoint={currentIncident} incidentPickMode={incidentPickMode} onIncidentPoint={setIncident} streetViewMode={streetViewMode} onStreetViewRequest={openStreetView} initialView={null} viewRequest={viewRequest} onViewChange={setMapView} />
        <div className="map-topbar">
          <div className="location-chip"><Icon name="pin" /><div><strong>Opole</strong><span>{visibleCount} {t("cameras")} · {visibleSites} {t("objects")}</span></div></div>
          <button className="map-settings-button" aria-haspopup="dialog" aria-controls="map-settings-dialog" onClick={() => settingsDialogRef.current?.showModal()}><Icon name="tools" /><span>{t("userPanelSettings")}</span></button>
          <div className="map-actions">
            <div className="mode-switch" role="group" aria-label={t("mapMode")}><button aria-pressed={!is3D} onClick={() => setIs3D(false)}>2D</button><button aria-pressed={is3D} onClick={() => setIs3D(true)} title={t("tiltTitle")}>3D</button></div>
            <button className="street-view-button" aria-pressed={streetViewMode} title={t("streetView")} onClick={() => { setStreetViewMode(value => !value); setAnalysisMode("none"); setAnalysisPoints([]); setIncidentPickMode(false); }}><Icon name="streetview" /><span>{t("streetViewShort")}</span></button>
            <button className="admin-button" onClick={() => setAdminOpen(true)}>{t("adminShort")}{Object.keys(adminDrafts).length ? <span>{Object.keys(adminDrafts).length}</span> : null}</button>
            <button className="icon-button center-button" title={t("centerMap")} aria-label={t("centerMap")} onClick={() => setResetRequest((value) => value + 1)}><Icon name="center" /></button>
          </div>
        </div>
        {invalidLink && <div className="link-notice" role="status"><p>{t("invalidLink")}</p><button className="secondary-button" onClick={() => { setInvalidLink(false); updateCameraUrl(null, true); }}>{t("understood")}</button></div>}
        <div className="map-bottom-tools">
          <button className="sector-toggle" aria-pressed={showSectors} onClick={() => setShowSectors((value) => !value)}><Icon name="sector" /> {t("sectors")} <span>{showSectors ? t("enabled") : t("disabled")}</span></button>
          <button className="sector-toggle coverage-toggle" aria-pressed={coverageMode} onClick={() => setCoverageMode(value => !value)}>{t("coverage")} <span>{coverageMode ? t("coverageOn") : "—"}</span></button>
          <button className="sector-toggle heatmap-toggle" aria-pressed={heatmapMode} onClick={() => setHeatmapMode(value => !value)}>{t("heatmap")} <span>{heatmapMode ? t("coverageOn") : "—"}</span></button>
          <button className="sector-toggle drone-toggle" aria-pressed={droneZonesMode} onClick={toggleDroneZones}>{t("droneZones")} <span>{droneZonesMode ? t("coverageOn") : "—"}</span></button>
          <span className="map-caption">{is3D ? mapTheme === "dark" ? "Ночной 3D · объёмные здания OpenStreetMap" : t("viewTilt") : t("viewTop")}</span>
          {is3D && <span className="map-caption rotate-hint">{t("rotateHint")}</span>}
          {streetViewMode && <span className="map-caption street-view-caption"><Icon name="streetview" /> {t("streetViewHint")}</span>}
          {visibleReports && <span className="map-caption reported-caption">{t("userOrange")}</span>}
          {visibleSites > 0 && <span className="map-caption object-caption">{t("objectMarker")}</span>}
          {street && <span className="map-caption street-caption"><i /> {t("streetMarked")} {street.name}<button aria-label={t("removeStreet")} onClick={() => setStreet(null)}>×</button></span>}
          {coverageMode && (coverageHasOptics ? <><span className="map-caption coverage-known">{t("coverageKnown")}</span><span className="map-caption coverage-unknown">{t("coverageUnknown")}</span></> : <span className="map-caption coverage-unknown">{t("coverageNone")}</span>)}
          <span className="map-caption approximate-coverage-caption">{t("approxCoverageHint")}</span>
          {heatmapMode && <span className="map-caption heatmap-caption">{t("heatmapLegend")}</span>}
          {droneZonesMode && <span className="map-caption drone-caption">{t("droneZoneLegend")} <button type="button" onClick={showDroneZone}>{t("droneZoneDetails")}</button></span>}
        </div>
        {droneZonesMode && droneInfoOpen && !selected && <aside className="drone-zone-card" aria-labelledby="drone-zone-title">
          <div className="drone-zone-heading"><div><p className="eyebrow">{t("droneZoneEyebrow")}</p><h2 id="drone-zone-title">{epopAtz.name}</h2></div><button className="icon-button" aria-label={t("droneZoneClose")} onClick={() => setDroneInfoOpen(false)}><Icon name="close" /></button></div>
          <p className="drone-zone-status conditional">{t("droneZoneConditionalStatus")}</p>
          <dl className="drone-zone-facts">
            <div><dt>{t("droneZoneRadius")}</dt><dd>{epopAtz.radiusMeters / 1000} km</dd></div>
            <div><dt>{t("droneZoneHeight")}</dt><dd>{epopAtz.lowerLimit}–{epopAtz.upperLimit}</dd></div>
            <div><dt>{t("droneZoneActivation")}</dt><dd>{epopAtz.activity}</dd></div>
            <div><dt>{t("droneZoneClass")}</dt><dd>{epopAtz.airspaceClass}</dd></div>
          </dl>
          <div className="drone-zone-contact"><span>{t("droneZoneRadio")}</span><strong>{epopAtz.frequency}</strong><span>{epopAtz.operator}</span></div>
          <section className="drone-access-legend" aria-labelledby="drone-access-title">
            <h3 id="drone-access-title">{t("droneLegendTitle")}</h3>
            <p><i className="prohibited" /><span><strong>{t("droneLegendProhibitedTitle")}</strong>{t("droneLegendProhibited")}</span></p>
            <p><i className="conditional" /><span><strong>{t("droneLegendConditionalTitle")}</strong>{t("droneLegendConditional")}</span></p>
            <p><i className="information" /><span><strong>{t("droneLegendInformationTitle")}</strong>{t("droneLegendInformation")}</span></p>
            <p><i className="general" /><span><strong>{t("droneLegendGeneralTitle")}</strong>{t("droneLegendGeneral")}</span></p>
          </section>
          <p className="drone-zone-warning">{t("droneZoneWarning")}</p>
          <a className="drone-zone-primary" href={droneTowerUrl} target="_blank" rel="noopener noreferrer">{t("checkDroneTower")} <span>↗</span></a>
          <div className="drone-zone-links"><a href={airspaceMapUrl} target="_blank" rel="noopener noreferrer">{t("droneZoneAupMap")} ↗</a><a href={droneZoneSourceUrl} target="_blank" rel="noopener noreferrer">{t("droneZoneSource")} · {epopAtz.sourceDate} ↗</a></div>
        </aside>}
        {selected && <CameraDetails key={selected.id} camera={selected} availability={availability[selected.id]} onClose={closeCamera} favorite={favoriteIds.has(selected.id)} favoritesReady={favorites.ready} onToggleFavorite={() => favorites.toggle(selected.id)} onSnapshot={setSnapshotCamera} />}
        <nav className="mobile-navigation" aria-label={t("mobileNavigation")}>
          <button aria-current="page"><Icon name="map" />{t("map")}</button>
          <button ref={listButtonRef} onClick={() => setMobileList(true)}><Icon name="list" />{t("menu")} <span>{visible.length}</span></button>
        </nav>
      </main>
      <dialog ref={settingsDialogRef} id="map-settings-dialog" className="map-settings-dialog" aria-labelledby="map-settings-title" aria-describedby="map-settings-hint">
        <header className="map-settings-heading">
          <div><h2 id="map-settings-title">{t("userPanelSettings")}</h2><p id="map-settings-hint">{t("userPanelSettingsHint")}</p></div>
          <button className="icon-button" aria-label={t("closeMapSettings")} onClick={() => settingsDialogRef.current?.close()}><Icon name="close" /></button>
        </header>
          <div className="user-panel-settings">
            <div className="experience-tools"><label><span>{t("language")}</span><select aria-label={t("language")} value={locale} onChange={event => setLocale(event.target.value as Locale)}>{Object.entries(languages).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label><div><span>{t("mapTheme")}</span><button aria-pressed={mapTheme === "light"} onClick={() => changeTheme("light")}>{t("light")}</button><button aria-pressed={mapTheme === "dark"} onClick={() => changeTheme("dark")}>{t("dark")}</button></div><AppInstall /></div>
            <div className="sidebar-intro">
              <p>{t("cityMap")}</p>
              <div className="catalog-stats"><span><b>{totalCount}</b> {t("cameras")}</span><span><b>{totalSites}</b> {t("objects")}</span></div>
              <p className="catalog-explanation">{t("catalogExplanation")} {verifiedCount}.</p>
              {reportedCount > 0 && <p className="catalog-provenance">{t("reportedPrefix")} {reportedCount}</p>}
              <SourceOverview cameras={cameras} />
            </div>
            <StreetSearch street={street} onFound={result => { showStreet(result); settingsDialogRef.current?.close(); }} onClear={() => setStreet(null)} />
            <details className="layer-filter"><summary>{t("layers")}</summary><div>{cameraLayers.map(layer => <label key={layer}><input type="checkbox" checked={enabledLayers.has(layer)} onChange={() => toggleLayer(layer)} /><span>{t("layer" + layer[0].toUpperCase() + layer.slice(1))}</span><b>{layerCounts[layer]}</b></label>)}</div></details>
          </div>
      </dialog>
      {snapshotCamera && <CameraSnapshotViewer key={snapshotCamera.id} camera={snapshotCamera} onStatus={value => updateAvailability(snapshotCamera, value)} onClose={() => setSnapshotCamera(null)} />}
      <AdminPanel cameras={cameras} drafts={adminDrafts} open={adminOpen} initialId={selectedId} onClose={() => setAdminOpen(false)} onSave={saveAdminDraft} onDelete={deleteAdminDraft} onClear={clearAdminDrafts} onSelect={(camera) => { setAdminOpen(false); selectCamera(camera); }} />
    </div>
  );
}

export default function CameraMap({ cameras }: { cameras: Camera[] }) { return <I18nProvider><CameraMapInner cameras={cameras} /></I18nProvider>; }
