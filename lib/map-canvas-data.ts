import type { Map as LibreMap, GeoJSONSource } from "maplibre-gl";
import { groupCameraSites, type Camera } from "./camera";
import { directionGeoJson, sectorsGeoJson } from "./geometry";
import { coverageGeoJson } from "./map-features";
import { selectionGeoJson, type AnalysisSelection } from "./map-analysis";
import { droneZonesGeoJson } from "./drone-zones";
import type { MapCanvasProps as Props } from "./map-canvas-types";

const empty = { type: "FeatureCollection" as const, features: [] };
export function syncPadding(map: LibreMap, selected: Camera | null) {
  const bottom =
    selected && window.matchMedia("(max-width: 760px)").matches
      ? Math.round(map.getContainer().clientHeight * 0.4) + 60
      : 0;
  if (map.getPadding().bottom !== bottom)
    map.setPadding({ top: 0, bottom, left: 0, right: 0 });
}
function siteData(cameras: Camera[], selected: Camera | null) {
  return {
    type: "FeatureCollection" as const,
    features: groupCameraSites(cameras).map((site) => ({
      type: "Feature" as const,
      properties: {
        siteId: site.id,
        cameraCount: site.cameraCount,
        reportedCount: site.reportedCount,
        documentedSiteCount: site.documentedSiteCount,
        selected: site.cameras.some((camera) => camera.id === selected?.id),
      },
      geometry: { type: "Point" as const, coordinates: [site.lng, site.lat] },
    })),
  };
}
function heatData(cameras: Camera[]) {
  return {
    type: "FeatureCollection" as const,
    features: groupCameraSites(cameras)
      .filter((site) => site.cameraCount > 0)
      .map((site) => ({
        type: "Feature" as const,
        properties: { weight: site.cameraCount },
        geometry: { type: "Point" as const, coordinates: [site.lng, site.lat] },
      })),
  };
}
export function syncData(map: LibreMap, props: Props) {
  syncPadding(map, props.selected);
  (map.getSource("camera-points") as GeoJSONSource)?.setData(
    siteData(props.cameras, props.selected),
  );
  (map.getSource("camera-heat-points") as GeoJSONSource)?.setData(
    heatData(props.cameras),
  );
  (map.getSource("camera-sectors") as GeoJSONSource)?.setData(
    props.showSectors ? sectorsGeoJson(props.cameras) : empty,
  );
  (map.getSource("camera-direction") as GeoJSONSource)?.setData(
    props.showSectors ? directionGeoJson(props.selected) : empty,
  );
  (map.getSource("street-highlight") as GeoJSONSource)?.setData(
    props.street?.geometry ?? empty,
  );
  (map.getSource("coverage-area") as GeoJSONSource)?.setData(
    props.coverageMode ? coverageGeoJson(props.cameras) : empty,
  );
  (map.getSource("coverage-sectors") as GeoJSONSource)?.setData(
    props.coverageMode ? sectorsGeoJson(props.cameras) : empty,
  );
  (map.getSource("drone-zones") as GeoJSONSource)?.setData(
    props.droneZonesMode ? droneZonesGeoJson() : empty,
  );
  const selection: AnalysisSelection | null =
    props.analysisPoints.length === 2 && props.analysisMode !== "none"
      ? {
          mode: props.analysisMode,
          points: [props.analysisPoints[0], props.analysisPoints[1]],
        }
      : null;
  (map.getSource("analysis-shape") as GeoJSONSource)?.setData(
    selectionGeoJson(selection),
  );
  (map.getSource("analysis-points") as GeoJSONSource)?.setData({
    type: "FeatureCollection",
    features: props.analysisPoints.map((point, index) => ({
      type: "Feature",
      properties: { index: index + 1 },
      geometry: { type: "Point", coordinates: point },
    })),
  });
  (map.getSource("incident-point") as GeoJSONSource)?.setData({
    type: "FeatureCollection",
    features: props.incidentPoint
      ? [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [props.incidentPoint.lng, props.incidentPoint.lat],
            },
          },
        ]
      : [],
  });
  if (map.getLayer("camera-heat"))
    map.setLayoutProperty(
      "camera-heat",
      "visibility",
      props.heatmapMode ? "visible" : "none",
    );
  if (map.getLayer("sector-fill")) {
    map.setPaintProperty("sector-fill", "fill-color", [
      "case",
      ["==", ["get", "id"], props.selected?.id ?? ""],
      "#087a62",
      "#487b8c",
    ]);
    map.setPaintProperty("sector-fill", "fill-opacity", [
      "case",
      ["==", ["get", "id"], props.selected?.id ?? ""],
      0.32,
      0.09,
    ]);
    map.setPaintProperty("sector-line", "line-opacity", [
      "case",
      ["==", ["get", "id"], props.selected?.id ?? ""],
      1,
      0.35,
    ]);
  }
}
