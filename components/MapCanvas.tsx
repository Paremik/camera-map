"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as LibreMap } from "maplibre-gl";
import { catalogCountLabel, countCameras, countDocumentedSites, groupCameraSites, type Camera } from "@/lib/camera";
import { directionGeoJson, sectorsGeoJson } from "@/lib/geometry";
import type { StreetHighlight } from "@/lib/street-search";
import { coverageGeoJson } from "@/lib/map-features";
import { selectionGeoJson, type AnalysisMode, type AnalysisSelection, type LngLat } from "@/lib/map-analysis";
import type { MapView } from "@/lib/map-state";
import { droneZonesGeoJson } from "@/lib/drone-zones";

type Props = {
  cameras: Camera[]; selected: Camera | null; onSelect: (camera: Camera) => void;
  is3D: boolean; showSectors: boolean; resetRequest: number; focusRequest: number;
  street: StreetHighlight | null; streetFocusRequest: number;
  mapTheme: "light" | "dark"; coverageMode: boolean; heatmapMode: boolean; droneZonesMode: boolean;
  analysisMode: AnalysisMode; analysisPoints: LngLat[]; onAnalysisPoint: (point: LngLat) => void;
  initialView: MapView | null; viewRequest: { id: number; view: MapView } | null; onViewChange: (view: MapView) => void;
};
const center: [number, number] = [17.92240, 50.66855];
const empty = { type: "FeatureCollection" as const, features: [] };
function syncPadding(map: LibreMap, selected: Camera | null) {
  const bottom = selected && window.matchMedia("(max-width: 760px)").matches
    ? Math.round(map.getContainer().clientHeight * 0.4) + 60 : 0;
  if (map.getPadding().bottom !== bottom) map.setPadding({ top: 0, bottom, left: 0, right: 0 });
}
function siteData(cameras: Camera[], selected: Camera | null) {
  return { type: "FeatureCollection" as const, features: groupCameraSites(cameras).map((site) => ({
    type: "Feature" as const, properties: { siteId: site.id, cameraCount: site.cameraCount, reportedCount: site.reportedCount, documentedSiteCount: site.documentedSiteCount, selected: site.cameras.some(camera => camera.id === selected?.id) },
    geometry: { type: "Point" as const, coordinates: [site.lng, site.lat] },
  })) };
}
function heatData(cameras: Camera[]) {
  return { type: "FeatureCollection" as const, features: groupCameraSites(cameras).filter(site => site.cameraCount > 0).map(site => ({
    type: "Feature" as const, properties: { weight: site.cameraCount }, geometry: { type: "Point" as const, coordinates: [site.lng, site.lat] },
  })) };
}
function syncData(map: LibreMap, props: Props) {
  syncPadding(map, props.selected);
  (map.getSource("camera-points") as GeoJSONSource)?.setData(siteData(props.cameras, props.selected));
  (map.getSource("camera-heat-points") as GeoJSONSource)?.setData(heatData(props.cameras));
  (map.getSource("camera-sectors") as GeoJSONSource)?.setData(props.showSectors ? sectorsGeoJson(props.cameras) : empty);
  (map.getSource("camera-direction") as GeoJSONSource)?.setData(props.showSectors ? directionGeoJson(props.selected) : empty);
  (map.getSource("street-highlight") as GeoJSONSource)?.setData(props.street?.geometry ?? empty);
  (map.getSource("coverage-area") as GeoJSONSource)?.setData(props.coverageMode ? coverageGeoJson(props.cameras) : empty);
  (map.getSource("coverage-sectors") as GeoJSONSource)?.setData(props.coverageMode ? sectorsGeoJson(props.cameras) : empty);
  (map.getSource("drone-zones") as GeoJSONSource)?.setData(props.droneZonesMode ? droneZonesGeoJson() : empty);
  const selection: AnalysisSelection | null = props.analysisPoints.length === 2 && props.analysisMode !== "none" ? { mode: props.analysisMode, points: [props.analysisPoints[0], props.analysisPoints[1]] } : null;
  (map.getSource("analysis-shape") as GeoJSONSource)?.setData(selectionGeoJson(selection));
  (map.getSource("analysis-points") as GeoJSONSource)?.setData({ type: "FeatureCollection", features: props.analysisPoints.map((point, index) => ({ type: "Feature", properties: { index: index + 1 }, geometry: { type: "Point", coordinates: point } })) });
  if (map.getLayer("camera-heat")) map.setLayoutProperty("camera-heat", "visibility", props.heatmapMode ? "visible" : "none");
  if (map.getLayer("sector-fill")) {
    map.setPaintProperty("sector-fill", "fill-color", ["case", ["==", ["get", "id"], props.selected?.id ?? ""], "#087a62", "#487b8c"]);
    map.setPaintProperty("sector-fill", "fill-opacity", ["case", ["==", ["get", "id"], props.selected?.id ?? ""], 0.32, 0.09]);
    map.setPaintProperty("sector-line", "line-opacity", ["case", ["==", ["get", "id"], props.selected?.id ?? ""], 1, 0.35]);
  }
}

export default function MapCanvas(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const latest = useRef(props);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const activeSite = groupCameraSites(props.cameras).find((site) => site.id === activeSiteId);

  useEffect(() => { latest.current = props; }, [props]);
  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    let map: LibreMap;
    const timeout = window.setTimeout(() => {
      if (!disposed) setError("Карта загружается слишком долго. Проверьте подключение и повторите попытку.");
    }, 15000);
    try {
      map = new maplibregl.Map({
        container: containerRef.current, center: latest.current.initialView ? [latest.current.initialView.lng, latest.current.initialView.lat] : center, zoom: latest.current.initialView?.zoom ?? 15.3,
        pitch: latest.current.initialView?.pitch ?? (latest.current.is3D ? 55 : 0), bearing: latest.current.initialView?.bearing ?? (latest.current.is3D ? -12 : 0),
        canvasContextAttributes: { antialias: true }, maxZoom: 19, minZoom: 10,
        maxBounds: [[17.7, 50.5], [18.15, 50.85]], renderWorldCopies: false,
        dragRotate: false, touchPitch: false, attributionControl: false,
        locale: { "Map.Title": "Карта камер Opole. Камеры также доступны в списке.", "NavigationControl.ZoomIn": "Приблизить", "NavigationControl.ZoomOut": "Отдалить", "NavigationControl.ResetBearing": "Север вверху" },
        style: {
          version: 8,
          glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
          sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19,
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>' } },
          layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-saturation": -0.55 } }],
        },
      });
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
      map.on("error", () => {
        if (!disposed) setError("Не удалось загрузить часть карты. Список камер и ссылки на источники остаются доступны.");
      });
      map.getCanvas().addEventListener("webglcontextlost", () => {
        if (!disposed) { setReady(false); setError("Графический контекст карты потерян. Попробуйте загрузить карту снова."); }
      });
      map.on("load", () => {
        if (disposed) return;
        window.clearTimeout(timeout);
        map.addSource("camera-sectors", { type: "geojson", data: empty });
        map.addSource("camera-direction", { type: "geojson", data: empty });
        map.addSource("street-highlight", { type: "geojson", data: empty });
        map.addSource("coverage-area", { type: "geojson", data: empty });
        map.addSource("coverage-sectors", { type: "geojson", data: empty });
        map.addSource("drone-zones", { type: "geojson", data: empty });
        map.addSource("analysis-shape", { type: "geojson", data: empty });
        map.addSource("analysis-points", { type: "geojson", data: empty });
        map.addSource("camera-points", { type: "geojson", data: empty, cluster: true, clusterMaxZoom: 16, clusterRadius: 48,
          clusterProperties: { cameraCount: ["+", ["get", "cameraCount"]], reportedCount: ["+", ["get", "reportedCount"]], documentedSiteCount: ["+", ["get", "documentedSiteCount"]] } });
        map.addSource("camera-heat-points", { type: "geojson", data: empty });
        map.addLayer({ id: "coverage-unknown", type: "fill", source: "coverage-area", paint: { "fill-color": "#d58637", "fill-opacity": 0.13 } });
        map.addLayer({ id: "coverage-known", type: "fill", source: "coverage-sectors", paint: { "fill-color": "#31b96b", "fill-opacity": 0.42 } });
        map.addLayer({ id: "coverage-known-line", type: "line", source: "coverage-sectors", paint: { "line-color": "#1b8f50", "line-width": 2, "line-opacity": 0.9 } });
        map.addLayer({ id: "drone-zone-fill", type: "fill", source: "drone-zones", paint: { "fill-color": "#9b5de5", "fill-opacity": 0.12 } });
        map.addLayer({ id: "drone-zone-line", type: "line", source: "drone-zones", paint: { "line-color": "#8b43d1", "line-width": 3, "line-opacity": 0.9, "line-dasharray": [2, 1.5] } });
        map.addLayer({ id: "drone-zone-label", type: "symbol", source: "drone-zones", layout: { "text-field": ["concat", ["get", "name"], " · AUP"], "text-font": ["Open Sans Semibold"], "text-size": 14 }, paint: { "text-color": "#7a2fbd", "text-halo-color": "#ffffff", "text-halo-width": 2 } });
        map.addLayer({ id: "analysis-area-fill", type: "fill", source: "analysis-shape", filter: ["==", ["get", "kind"], "area"], paint: { "fill-color": "#8dccff", "fill-opacity": 0.18 } });
        map.addLayer({ id: "analysis-shape-line", type: "line", source: "analysis-shape", paint: { "line-color": "#59b8ff", "line-width": 4, "line-dasharray": [2, 1.5] } });
        map.addLayer({ id: "analysis-points-layer", type: "circle", source: "analysis-points", paint: { "circle-radius": 8, "circle-color": "#59b8ff", "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } });
        map.addLayer({ id: "street-highlight-casing", type: "line", source: "street-highlight", paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 5, 18, 12], "line-opacity": 0.95 } });
        map.addLayer({ id: "street-highlight-line", type: "line", source: "street-highlight", paint: { "line-color": "#1686ff", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3, 18, 8], "line-opacity": 0.9 } });
        map.addLayer({ id: "street-highlight-label", type: "symbol", source: "street-highlight", layout: { "symbol-placement": "line", "text-field": ["get", "name"], "text-font": ["Open Sans Semibold"], "text-size": 13, "symbol-spacing": 350 }, paint: { "text-color": "#ffffff", "text-halo-color": "#096ec5", "text-halo-width": 2 } });
        map.addLayer({ id: "sector-fill", type: "fill", source: "camera-sectors", paint: { "fill-color": "#087a62", "fill-opacity": 0.15 } });
        map.addLayer({ id: "sector-line", type: "line", source: "camera-sectors", paint: { "line-color": "#087a62", "line-width": 1.5 } });
        map.addLayer({ id: "direction-line", type: "line", source: "camera-direction", paint: { "line-color": "#075a49", "line-width": 2.5, "line-dasharray": [3, 2] } });
        map.addLayer({ id: "camera-heat", type: "heatmap", source: "camera-heat-points", layout: { visibility: "none" }, maxzoom: 18,
          paint: { "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 1, 0.55, 4, 0.9, 12, 1], "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1.4, 17, 2.6], "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 30, 17, 70], "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.86, 18, 0.72], "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(25,52,65,0)", 0.12, "#2c7bb6", 0.3, "#00a6ca", 0.5, "#a8ddb5", 0.68, "#fee08b", 0.84, "#f46d43", 1, "#a50026"] } });
        map.addLayer({ id: "camera-selected-halo", type: "circle", source: "camera-points", filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "selected"], true]],
          paint: { "circle-color": "#b8f285", "circle-radius": 30, "circle-opacity": 0.2, "circle-blur": 0.45 } });
        map.addLayer({ id: "camera-clusters", type: "circle", source: "camera-points", filter: ["has", "point_count"],
          paint: { "circle-color": "#10272c", "circle-radius": 24, "circle-stroke-color": ["case", [">", ["get", "reportedCount"], 0], "#f2bb6d", [">", ["get", "documentedSiteCount"], 0], "#82c8ef", "#b8f285"], "circle-stroke-width": 3 } });
        map.addLayer({ id: "camera-sites", type: "circle", source: "camera-points", filter: ["!", ["has", "point_count"]],
          paint: { "circle-color": ["case", ["==", ["get", "selected"], true], "#b8f285", "#10272c"], "circle-radius": ["case", ["==", ["get", "selected"], true], 24, 20], "circle-stroke-color": ["case", ["==", ["get", "selected"], true], "#ffffff", [">", ["get", "reportedCount"], 0], "#f2bb6d", [">", ["get", "documentedSiteCount"], 0], "#82c8ef", "#b8f285"], "circle-stroke-width": ["case", ["==", ["get", "selected"], true], 4, 3] } });
        map.addLayer({ id: "camera-count", type: "symbol", source: "camera-points",
          layout: { "text-field": ["case", [">", ["get", "documentedSiteCount"], 0], ["case", [">", ["get", "cameraCount"], 0], ["concat", ["to-string", ["get", "cameraCount"]], "+i"], "i"], ["to-string", ["get", "cameraCount"]]], "text-font": ["Open Sans Semibold"], "text-size": 14, "text-allow-overlap": true },
          paint: { "text-color": ["case", ["==", ["get", "selected"], true], "#102018", "#ffffff"] } });
        syncData(map, latest.current);
        setReady(true);
      });
      map.on("click", (event) => {
        if (latest.current.analysisMode !== "none") { latest.current.onAnalysisPoint([event.lngLat.lng, event.lngLat.lat]); setActiveSiteId(null); return; }
        if (!map.getLayer("camera-sites")) return;
        const features = map.queryRenderedFeatures(event.point, { layers: ["camera-clusters", "camera-sites"] });
        const feature = features[0];
        if (!feature || feature.geometry.type !== "Point") { setActiveSiteId(null); return; }
        const coordinates = feature.geometry.coordinates as [number, number];
        if (feature.properties.cluster) {
          const source = map.getSource("camera-points") as GeoJSONSource;
          void source.getClusterExpansionZoom(feature.properties.cluster_id).then((zoom) => {
            if (!disposed) map.easeTo({ center: coordinates, zoom });
          }).catch(() => { if (!disposed) setError("Не удалось раскрыть группу камер. Повторите попытку."); });
        } else {
          const site = groupCameraSites(latest.current.cameras).find((item) => item.id === feature.properties.siteId);
          if (!site) return;
          setActiveSiteId(site.cameras.length > 1 ? site.id : null);
          if (site.cameras.length === 1) latest.current.onSelect(site.cameras[0]);
        }
      });
      map.on("mousemove", (event) => {
        if (latest.current.analysisMode !== "none") map.getCanvas().style.cursor = "crosshair";
        else if (map.getLayer("camera-sites")) map.getCanvas().style.cursor = map.queryRenderedFeatures(event.point, { layers: ["camera-clusters", "camera-sites"] }).length ? "pointer" : "";
      });
      map.on("moveend", () => { const point = map.getCenter(); latest.current.onViewChange({ lng: point.lng, lat: point.lat, zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() }); });
    } catch {
      window.clearTimeout(timeout);
      mapRef.current?.remove();
      mapRef.current = null;
      setError("Не удалось запустить карту. Нужен браузер с поддержкой WebGL. Камеры доступны в списке.");
      return;
    }
    const resizeObserver = new ResizeObserver(() => { syncPadding(map, latest.current.selected); map.resize(); });
    resizeObserver.observe(containerRef.current);
    return () => {
      disposed = true; window.clearTimeout(timeout); resizeObserver.disconnect();
      map.remove(); mapRef.current = null;
    };
  }, [attempt]);

  useEffect(() => { if (ready && mapRef.current) syncData(mapRef.current, props); }, [ready, props.cameras, props.selected, props.showSectors, props.street, props.coverageMode, props.heatmapMode, props.droneZonesMode, props.analysisMode, props.analysisPoints]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map?.getLayer("osm")) return;
    const dark = props.mapTheme === "dark";
    map.setPaintProperty("osm", "raster-saturation", dark ? -0.82 : -0.55);
    map.setPaintProperty("osm", "raster-brightness-min", dark ? 0.08 : 0);
    map.setPaintProperty("osm", "raster-brightness-max", dark ? 0.52 : 1);
    map.setPaintProperty("osm", "raster-contrast", dark ? 0.18 : 0);
  }, [ready, props.mapTheme]);
  useEffect(() => {
    if (ready) mapRef.current?.easeTo({ pitch: props.is3D ? 55 : 0, bearing: props.is3D ? -12 : 0, duration: 650 });
  }, [ready, props.is3D]);
  useEffect(() => {
    if (ready && props.resetRequest) mapRef.current?.flyTo({ center, zoom: 15.3, pitch: latest.current.is3D ? 55 : 0, bearing: latest.current.is3D ? -12 : 0 });
  }, [ready, props.resetRequest]);
  useEffect(() => {
    const selected = latest.current.selected;
    if (ready && props.focusRequest && selected) mapRef.current?.flyTo({ center: [selected.lng, selected.lat], zoom: 16.4 });
  }, [ready, props.focusRequest]);
  useEffect(() => {
    if (!ready || !props.streetFocusRequest || !props.street) return;
    const [minLng, minLat, maxLng, maxLat] = props.street.bbox;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    mapRef.current?.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: mobile ? { top: 110, right: 35, bottom: 95, left: 35 } : 80, maxZoom: 17, duration: 850 });
  }, [ready, props.streetFocusRequest, props.street]);
  useEffect(() => {
    if (!ready || !props.coverageMode) return;
    const features = sectorsGeoJson(props.cameras).features;
    const points = features.flatMap(feature => feature.geometry.coordinates[0]);
    if (!points.length) return;
    const lngs = points.map(point => point[0]), lats = points.map(point => point[1]);
    mapRef.current?.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: window.innerWidth <= 760 ? 55 : 120, maxZoom: 16.2, duration: 750 });
  }, [ready, props.coverageMode, props.cameras]);
  useEffect(() => {
    if (!ready || !props.droneZonesMode) return;
    mapRef.current?.fitBounds([[17.635, 50.542], [17.928, 50.724]], { padding: window.innerWidth <= 760 ? 36 : 70, duration: 750 });
  }, [ready, props.droneZonesMode]);
  useEffect(() => {
    if (!ready || !props.viewRequest) return;
    mapRef.current?.flyTo({ center: [props.viewRequest.view.lng, props.viewRequest.view.lat], zoom: props.viewRequest.view.zoom, bearing: props.viewRequest.view.bearing, pitch: props.viewRequest.view.pitch, duration: 750 });
  }, [ready, props.viewRequest]);
  function retry() { setReady(false); setError(null); setActiveSiteId(null); setAttempt((value) => value + 1); }

  return (
    <>
      <div ref={containerRef} className="map" data-ready={ready} data-mode={props.is3D ? "3d" : "2d"} data-theme={props.mapTheme} data-coverage={props.coverageMode} data-heatmap={props.heatmapMode} data-drone-zones={props.droneZonesMode} data-analysis={props.analysisMode} data-analysis-points={props.analysisPoints.length} data-camera-count={countCameras(props.cameras)} data-object-count={countDocumentedSites(props.cameras)} data-street={props.street?.name ?? ""} data-street-segments={props.street?.geometry.features.length ?? 0} />
      {!ready && !error && <div className="map-loading" role="status">Загружаем карту Opole…</div>}
      {error && <div className="map-error" role="alert"><p>{error}</p><button className="secondary-button" onClick={retry}>Повторить загрузку карты</button></div>}
      {activeSite && <section className="site-picker" aria-label="Камеры в этой точке"><div><strong>В этой точке · {catalogCountLabel(activeSite.cameras)}</strong><button aria-label="Закрыть выбор камер" onClick={() => setActiveSiteId(null)}>×</button></div><p>Камеры, группы и объекты с одним ориентиром</p>{activeSite.cameras.map((camera) => <button key={camera.id} onClick={() => { props.onSelect(camera); setActiveSiteId(null); }}>{camera.name}<span>↗</span></button>)}</section>}
    </>
  );
}
