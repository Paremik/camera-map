"use client";
import { useI18n } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as LibreMap } from "maplibre-gl";
import {
  countCameras,
  countDocumentedSites,
  groupCameraSites,
} from "@/lib/camera";
import type { MapCanvasProps as Props } from "@/lib/map-canvas-types";
import { syncData, syncPadding } from "@/lib/map-canvas-data";
import { sectorsGeoJson } from "@/lib/geometry";
import { addMapLayers } from "@/lib/map-canvas-layers";
import { addMapInteractions } from "@/lib/map-canvas-interactions";

const center: [number, number] = [17.9224, 50.66855];
export default function MapCanvas(props: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const latest = useRef(props);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const labels = [
      [".maplibregl-ctrl-zoom-in", "zoomIn"],
      [".maplibregl-ctrl-zoom-out", "zoomOut"],
      [".maplibregl-ctrl-compass", "northUp"],
    ] as const;
    for (const [selector, key] of labels) {
      const button = containerRef.current?.querySelector(selector);
      button?.setAttribute("aria-label", t(key));
      button?.setAttribute("title", t(key));
    }
    containerRef.current
      ?.querySelector("canvas")
      ?.setAttribute("aria-label", t("mapTitle"));
  }, [t, ready]);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const activeSite = groupCameraSites(props.cameras).find(
    (site) => site.id === activeSiteId,
  );

  useEffect(() => {
    latest.current = props;
  }, [props]);
  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    let map: LibreMap;
    const timeout = window.setTimeout(() => {
      if (!disposed) setError("mapTimeout");
    }, 15000);
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        center: latest.current.initialView
          ? [latest.current.initialView.lng, latest.current.initialView.lat]
          : center,
        zoom: latest.current.initialView?.zoom ?? 15.3,
        pitch:
          latest.current.initialView?.pitch ?? (latest.current.is3D ? 55 : 0),
        bearing:
          latest.current.initialView?.bearing ??
          (latest.current.is3D ? -12 : 0),
        canvasContextAttributes: { antialias: true },
        maxZoom: 19,
        minZoom: 10,
        maxBounds: [
          [17.7, 50.5],
          [18.15, 50.85],
        ],
        renderWorldCopies: false,
        dragRotate: false,
        touchPitch: false,
        attributionControl: false,
        locale: {
          "Map.Title": t("mapTitle"),
          "NavigationControl.ZoomIn": t("zoomIn"),
          "NavigationControl.ZoomOut": t("zoomOut"),
          "NavigationControl.ResetBearing": t("northUp"),
        },
        style: {
          version: 8,
          glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              maxzoom: 19,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
              paint: { "raster-saturation": -0.55 },
            },
          ],
        },
      });
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: true }),
        "top-right",
      );
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-right",
      );
      map.addControl(
        new maplibregl.ScaleControl({ unit: "metric" }),
        "bottom-left",
      );
      map.on("error", () => {
        if (!disposed) setError("mapPartial");
      });
      map.getCanvas().addEventListener("webglcontextlost", () => {
        if (!disposed) {
          setReady(false);
          setError("mapContext");
        }
      });
      map.on("load", () => {
        if (disposed) return;
        window.clearTimeout(timeout);
        addMapLayers(map);
        syncData(map, latest.current);
        setReady(true);
      });
      addMapInteractions(
        map,
        latest,
        () => disposed,
        setActiveSiteId,
        setError,
      );
    } catch {
      window.clearTimeout(timeout);
      mapRef.current?.remove();
      mapRef.current = null;
      setError("mapWebgl");
      return;
    }
    const resizeObserver = new ResizeObserver(() => {
      syncPadding(map, latest.current.selected);
      map.resize();
    });
    resizeObserver.observe(containerRef.current);
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    if (ready && mapRef.current) syncData(mapRef.current, props);
  }, [
    ready,
    props.cameras,
    props.selected,
    props.showSectors,
    props.street,
    props.coverageMode,
    props.heatmapMode,
    props.droneZonesMode,
    props.analysisMode,
    props.analysisPoints,
    props.incidentPoint,
  ]);
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
    if (ready)
      mapRef.current?.easeTo({
        pitch: props.is3D ? 55 : 0,
        bearing: props.is3D ? -12 : 0,
        duration: 650,
      });
  }, [ready, props.is3D]);
  useEffect(() => {
    if (ready && props.resetRequest)
      mapRef.current?.flyTo({
        center,
        zoom: 15.3,
        pitch: latest.current.is3D ? 55 : 0,
        bearing: latest.current.is3D ? -12 : 0,
      });
  }, [ready, props.resetRequest]);
  useEffect(() => {
    const selected = latest.current.selected;
    if (ready && props.focusRequest && selected)
      mapRef.current?.flyTo({
        center: [selected.lng, selected.lat],
        zoom: 16.4,
      });
  }, [ready, props.focusRequest]);
  useEffect(() => {
    if (!ready || !props.streetFocusRequest || !props.street) return;
    const [minLng, minLat, maxLng, maxLat] = props.street.bbox;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    mapRef.current?.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: mobile ? { top: 110, right: 35, bottom: 95, left: 35 } : 80,
        maxZoom: 17,
        duration: 850,
      },
    );
  }, [ready, props.streetFocusRequest, props.street]);
  useEffect(() => {
    if (!ready || !props.coverageMode) return;
    const features = sectorsGeoJson(props.cameras).features;
    const points = features.flatMap(
      (feature) => feature.geometry.coordinates[0],
    );
    if (!points.length) return;
    const lngs = points.map((point) => point[0]),
      lats = points.map((point) => point[1]);
    mapRef.current?.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        padding: window.innerWidth <= 760 ? 55 : 120,
        maxZoom: 16.2,
        duration: 750,
      },
    );
  }, [ready, props.coverageMode, props.cameras]);
  useEffect(() => {
    if (!ready || !props.droneZonesMode) return;
    mapRef.current?.fitBounds(
      [
        [17.635, 50.542],
        [17.928, 50.724],
      ],
      { padding: window.innerWidth <= 760 ? 36 : 70, duration: 750 },
    );
  }, [ready, props.droneZonesMode]);
  useEffect(() => {
    if (!ready || !props.viewRequest) return;
    mapRef.current?.flyTo({
      center: [props.viewRequest.view.lng, props.viewRequest.view.lat],
      zoom: props.viewRequest.view.zoom,
      bearing: props.viewRequest.view.bearing,
      pitch: props.viewRequest.view.pitch,
      duration: 750,
    });
  }, [ready, props.viewRequest]);
  function retry() {
    setReady(false);
    setError(null);
    setActiveSiteId(null);
    setAttempt((value) => value + 1);
  }

  return (
    <>
      <div
        ref={containerRef}
        className="map"
        data-ready={ready}
        data-mode={props.is3D ? "3d" : "2d"}
        data-theme={props.mapTheme}
        data-coverage={props.coverageMode}
        data-heatmap={props.heatmapMode}
        data-drone-zones={props.droneZonesMode}
        data-analysis={props.analysisMode}
        data-analysis-points={props.analysisPoints.length}
        data-incident={props.incidentPoint ? "true" : "false"}
        data-camera-count={countCameras(props.cameras)}
        data-object-count={countDocumentedSites(props.cameras)}
        data-street={props.street?.name ?? ""}
        data-street-segments={props.street?.geometry.features.length ?? 0}
      />
      {!ready && !error && (
        <div className="map-loading" role="status">
          {t("mapLoading")}
        </div>
      )}
      {error && (
        <div className="map-error" role="alert">
          <p>{t(error)}</p>
          <button className="secondary-button" onClick={retry}>
            {t("mapRetry")}
          </button>
        </div>
      )}
      {activeSite && (
        <section className="site-picker" aria-label={t("samePoint")}>
          <div>
            <strong>
              {t("samePoint")} · {activeSite.cameras.length}
            </strong>
            <button
              aria-label={t("closeCard")}
              onClick={() => setActiveSiteId(null)}
            >
              ×
            </button>
          </div>
          <p>{t("samePointNote")}</p>
          {activeSite.cameras.map((camera) => (
            <button
              key={camera.id}
              onClick={() => {
                props.onSelect(camera);
                setActiveSiteId(null);
              }}
            >
              {camera.name}
              <span>↗</span>
            </button>
          ))}
        </section>
      )}
    </>
  );
}
