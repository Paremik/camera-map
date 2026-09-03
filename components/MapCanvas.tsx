"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as LibreMap } from "maplibre-gl";
import { countCameras, groupCameraSites, type Camera } from "@/lib/camera";
import { directionGeoJson, sectorsGeoJson } from "@/lib/geometry";

type Props = {
  cameras: Camera[]; selected: Camera | null; onSelect: (camera: Camera) => void;
  is3D: boolean; showSectors: boolean; resetRequest: number; focusRequest: number;
};
const center: [number, number] = [17.92240, 50.66855];
const empty = { type: "FeatureCollection" as const, features: [] };
function syncPadding(map: LibreMap, selected: Camera | null) {
  const bottom = selected && window.matchMedia("(max-width: 760px)").matches
    ? Math.round(map.getContainer().clientHeight * 0.4) + 60 : 0;
  if (map.getPadding().bottom !== bottom) map.setPadding({ top: 0, bottom, left: 0, right: 0 });
}
function siteData(cameras: Camera[]) {
  return { type: "FeatureCollection" as const, features: groupCameraSites(cameras).map((site) => ({
    type: "Feature" as const, properties: { siteId: site.id, cameraCount: site.cameraCount, reportedCount: site.reportedCount },
    geometry: { type: "Point" as const, coordinates: [site.lng, site.lat] },
  })) };
}
function syncData(map: LibreMap, props: Props) {
  syncPadding(map, props.selected);
  (map.getSource("camera-points") as GeoJSONSource)?.setData(siteData(props.cameras));
  (map.getSource("camera-sectors") as GeoJSONSource)?.setData(props.showSectors ? sectorsGeoJson(props.cameras) : empty);
  (map.getSource("camera-direction") as GeoJSONSource)?.setData(props.showSectors ? directionGeoJson(props.selected) : empty);
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
        container: containerRef.current, center, zoom: 15.3,
        pitch: latest.current.is3D ? 55 : 0, bearing: latest.current.is3D ? -12 : 0,
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
        map.addSource("camera-points", { type: "geojson", data: empty, cluster: true, clusterMaxZoom: 16, clusterRadius: 48,
          clusterProperties: { cameraCount: ["+", ["get", "cameraCount"]], reportedCount: ["+", ["get", "reportedCount"]] } });
        map.addLayer({ id: "sector-fill", type: "fill", source: "camera-sectors", paint: { "fill-color": "#087a62", "fill-opacity": 0.15 } });
        map.addLayer({ id: "sector-line", type: "line", source: "camera-sectors", paint: { "line-color": "#087a62", "line-width": 1.5 } });
        map.addLayer({ id: "direction-line", type: "line", source: "camera-direction", paint: { "line-color": "#075a49", "line-width": 2.5, "line-dasharray": [3, 2] } });
        map.addLayer({ id: "camera-clusters", type: "circle", source: "camera-points", filter: ["has", "point_count"],
          paint: { "circle-color": "#142e33", "circle-radius": 24, "circle-stroke-color": ["case", [">", ["get", "reportedCount"], 0], "#f2bb6d", "#b8f285"], "circle-stroke-width": 3 } });
        map.addLayer({ id: "camera-sites", type: "circle", source: "camera-points", filter: ["!", ["has", "point_count"]],
          paint: { "circle-color": "#142e33", "circle-radius": 20, "circle-stroke-color": ["case", [">", ["get", "reportedCount"], 0], "#f2bb6d", "#b8f285"], "circle-stroke-width": 3 } });
        map.addLayer({ id: "camera-count", type: "symbol", source: "camera-points",
          layout: { "text-field": ["to-string", ["get", "cameraCount"]], "text-font": ["Open Sans Semibold"], "text-size": 14, "text-allow-overlap": true },
          paint: { "text-color": "#ffffff" } });
        syncData(map, latest.current);
        setReady(true);
      });
      map.on("click", (event) => {
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
        if (map.getLayer("camera-sites")) map.getCanvas().style.cursor = map.queryRenderedFeatures(event.point, { layers: ["camera-clusters", "camera-sites"] }).length ? "pointer" : "";
      });
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

  useEffect(() => { if (ready && mapRef.current) syncData(mapRef.current, props); }, [ready, props.cameras, props.selected, props.showSectors]);
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
  function retry() { setReady(false); setError(null); setActiveSiteId(null); setAttempt((value) => value + 1); }

  return (
    <>
      <div ref={containerRef} className="map" data-ready={ready} data-mode={props.is3D ? "3d" : "2d"} data-camera-count={countCameras(props.cameras)} />
      {!ready && !error && <div className="map-loading" role="status">Загружаем карту Opole…</div>}
      {error && <div className="map-error" role="alert"><p>{error}</p><button className="secondary-button" onClick={retry}>Повторить загрузку карты</button></div>}
      {activeSite && <section className="site-picker" aria-label="Камеры в этой точке"><div><strong>В этой точке · {activeSite.cameraCount}</strong><button aria-label="Закрыть выбор камер" onClick={() => setActiveSiteId(null)}>×</button></div><p>Камеры и группы с одним ориентиром</p>{activeSite.cameras.map((camera) => <button key={camera.id} onClick={() => { props.onSelect(camera); setActiveSiteId(null); }}>{camera.name}<span>↗</span></button>)}</section>}
    </>
  );
}
