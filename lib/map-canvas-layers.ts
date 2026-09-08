import type { Map as LibreMap } from "maplibre-gl";
const empty = { type: "FeatureCollection" as const, features: [] };
export function addMapLayers(map: LibreMap) {
  map.addSource("camera-sectors", { type: "geojson", data: empty });
  map.addSource("camera-direction", { type: "geojson", data: empty });
  map.addSource("street-highlight", { type: "geojson", data: empty });
  map.addSource("coverage-area", { type: "geojson", data: empty });
  map.addSource("coverage-sectors", { type: "geojson", data: empty });
  map.addSource("drone-zones", { type: "geojson", data: empty });
  map.addSource("analysis-shape", { type: "geojson", data: empty });
  map.addSource("analysis-points", { type: "geojson", data: empty });
  map.addSource("incident-point", { type: "geojson", data: empty });
  map.addSource("camera-points", {
    type: "geojson",
    data: empty,
    cluster: true,
    clusterMaxZoom: 16,
    clusterRadius: 48,
    clusterProperties: {
      cameraCount: ["+", ["get", "cameraCount"]],
      reportedCount: ["+", ["get", "reportedCount"]],
      documentedSiteCount: ["+", ["get", "documentedSiteCount"]],
    },
  });
  map.addSource("camera-heat-points", { type: "geojson", data: empty });
  map.addLayer({
    id: "coverage-unknown",
    type: "fill",
    source: "coverage-area",
    paint: { "fill-color": "#d58637", "fill-opacity": 0.13 },
  });
  map.addLayer({
    id: "coverage-known",
    type: "fill",
    source: "coverage-sectors",
    paint: { "fill-color": "#31b96b", "fill-opacity": 0.42 },
  });
  map.addLayer({
    id: "coverage-known-line",
    type: "line",
    source: "coverage-sectors",
    paint: {
      "line-color": "#1b8f50",
      "line-width": 2,
      "line-opacity": 0.9,
    },
  });
  map.addLayer({
    id: "drone-zone-fill",
    type: "fill",
    source: "drone-zones",
    paint: { "fill-color": "#9b5de5", "fill-opacity": 0.12 },
  });
  map.addLayer({
    id: "drone-zone-line",
    type: "line",
    source: "drone-zones",
    paint: {
      "line-color": "#8b43d1",
      "line-width": 3,
      "line-opacity": 0.9,
      "line-dasharray": [2, 1.5],
    },
  });
  map.addLayer({
    id: "drone-zone-label",
    type: "symbol",
    source: "drone-zones",
    layout: {
      "text-field": ["concat", ["get", "name"], " · AUP"],
      "text-font": ["Open Sans Semibold"],
      "text-size": 14,
    },
    paint: {
      "text-color": "#7a2fbd",
      "text-halo-color": "#ffffff",
      "text-halo-width": 2,
    },
  });
  map.addLayer({
    id: "analysis-area-fill",
    type: "fill",
    source: "analysis-shape",
    filter: ["==", ["get", "kind"], "area"],
    paint: { "fill-color": "#8dccff", "fill-opacity": 0.18 },
  });
  map.addLayer({
    id: "analysis-shape-line",
    type: "line",
    source: "analysis-shape",
    paint: {
      "line-color": "#59b8ff",
      "line-width": 4,
      "line-dasharray": [2, 1.5],
    },
  });
  map.addLayer({
    id: "analysis-points-layer",
    type: "circle",
    source: "analysis-points",
    paint: {
      "circle-radius": 8,
      "circle-color": "#59b8ff",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
    },
  });
  map.addLayer({
    id: "incident-point-halo",
    type: "circle",
    source: "incident-point",
    paint: {
      "circle-radius": 20,
      "circle-color": "#c794ff",
      "circle-opacity": 0.22,
      "circle-blur": 0.25,
    },
  });
  map.addLayer({
    id: "incident-point-layer",
    type: "circle",
    source: "incident-point",
    paint: {
      "circle-radius": 9,
      "circle-color": "#7d4ab6",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
    },
  });
  map.addLayer({
    id: "street-highlight-casing",
    type: "line",
    source: "street-highlight",
    paint: {
      "line-color": "#ffffff",
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 5, 18, 12],
      "line-opacity": 0.95,
    },
  });
  map.addLayer({
    id: "street-highlight-line",
    type: "line",
    source: "street-highlight",
    paint: {
      "line-color": "#1686ff",
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3, 18, 8],
      "line-opacity": 0.9,
    },
  });
  map.addLayer({
    id: "street-highlight-label",
    type: "symbol",
    source: "street-highlight",
    layout: {
      "symbol-placement": "line",
      "text-field": ["get", "name"],
      "text-font": ["Open Sans Semibold"],
      "text-size": 13,
      "symbol-spacing": 350,
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#096ec5",
      "text-halo-width": 2,
    },
  });
  map.addLayer({
    id: "sector-fill",
    type: "fill",
    source: "camera-sectors",
    paint: { "fill-color": "#087a62", "fill-opacity": 0.15 },
  });
  map.addLayer({
    id: "sector-line",
    type: "line",
    source: "camera-sectors",
    paint: { "line-color": "#087a62", "line-width": 1.5 },
  });
  map.addLayer({
    id: "direction-line",
    type: "line",
    source: "camera-direction",
    paint: {
      "line-color": "#075a49",
      "line-width": 2.5,
      "line-dasharray": [3, 2],
    },
  });
  map.addLayer({
    id: "camera-heat",
    type: "heatmap",
    source: "camera-heat-points",
    layout: { visibility: "none" },
    maxzoom: 18,
    paint: {
      "heatmap-weight": [
        "interpolate",
        ["linear"],
        ["get", "weight"],
        1,
        0.55,
        4,
        0.9,
        12,
        1,
      ],
      "heatmap-intensity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        10,
        1.4,
        17,
        2.6,
      ],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 30, 17, 70],
      "heatmap-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        10,
        0.86,
        18,
        0.72,
      ],
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(25,52,65,0)",
        0.12,
        "#2c7bb6",
        0.3,
        "#00a6ca",
        0.5,
        "#a8ddb5",
        0.68,
        "#fee08b",
        0.84,
        "#f46d43",
        1,
        "#a50026",
      ],
    },
  });
  map.addLayer({
    id: "camera-selected-halo",
    type: "circle",
    source: "camera-points",
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "selected"], true],
    ],
    paint: {
      "circle-color": "#b8f285",
      "circle-radius": 30,
      "circle-opacity": 0.2,
      "circle-blur": 0.45,
    },
  });
  map.addLayer({
    id: "camera-clusters",
    type: "circle",
    source: "camera-points",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#10272c",
      "circle-radius": 24,
      "circle-stroke-color": [
        "case",
        [">", ["get", "reportedCount"], 0],
        "#f2bb6d",
        [">", ["get", "documentedSiteCount"], 0],
        "#82c8ef",
        "#b8f285",
      ],
      "circle-stroke-width": 3,
    },
  });
  map.addLayer({
    id: "camera-sites",
    type: "circle",
    source: "camera-points",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": [
        "case",
        ["==", ["get", "selected"], true],
        "#b8f285",
        "#10272c",
      ],
      "circle-radius": ["case", ["==", ["get", "selected"], true], 24, 20],
      "circle-stroke-color": [
        "case",
        ["==", ["get", "selected"], true],
        "#ffffff",
        [">", ["get", "reportedCount"], 0],
        "#f2bb6d",
        [">", ["get", "documentedSiteCount"], 0],
        "#82c8ef",
        "#b8f285",
      ],
      "circle-stroke-width": ["case", ["==", ["get", "selected"], true], 4, 3],
    },
  });
  map.addLayer({
    id: "camera-count",
    type: "symbol",
    source: "camera-points",
    layout: {
      "text-field": [
        "case",
        [">", ["get", "documentedSiteCount"], 0],
        [
          "case",
          [">", ["get", "cameraCount"], 0],
          ["concat", ["to-string", ["get", "cameraCount"]], "+i"],
          "i",
        ],
        ["to-string", ["get", "cameraCount"]],
      ],
      "text-font": ["Open Sans Semibold"],
      "text-size": 14,
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": [
        "case",
        ["==", ["get", "selected"], true],
        "#102018",
        "#ffffff",
      ],
    },
  });
}
