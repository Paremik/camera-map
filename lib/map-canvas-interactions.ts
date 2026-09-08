import type { Map as LibreMap, GeoJSONSource } from "maplibre-gl";
import { groupCameraSites } from "./camera";
import type { MapCanvasProps } from "./map-canvas-types";
export function addMapInteractions(
  map: LibreMap,
  latest: { current: MapCanvasProps },
  isDisposed: () => boolean,
  setActiveSiteId: (id: string | null) => void,
  setError: (key: string) => void,
) {
  map.on("click", (event) => {
    if (latest.current.incidentPickMode) {
      latest.current.onIncidentPoint({
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
      });
      setActiveSiteId(null);
      return;
    }
    if (latest.current.analysisMode !== "none") {
      latest.current.onAnalysisPoint([event.lngLat.lng, event.lngLat.lat]);
      setActiveSiteId(null);
      return;
    }
    if (!map.getLayer("camera-sites")) return;
    const features = map.queryRenderedFeatures(event.point, {
      layers: ["camera-clusters", "camera-sites"],
    });
    const feature = features[0];
    if (!feature || feature.geometry.type !== "Point") {
      setActiveSiteId(null);
      return;
    }
    const coordinates = feature.geometry.coordinates as [number, number];
    if (feature.properties.cluster) {
      const source = map.getSource("camera-points") as GeoJSONSource;
      void source
        .getClusterExpansionZoom(feature.properties.cluster_id)
        .then((zoom) => {
          if (!isDisposed()) map.easeTo({ center: coordinates, zoom });
        })
        .catch(() => {
          if (!isDisposed()) setError("mapCluster");
        });
    } else {
      const site = groupCameraSites(latest.current.cameras).find(
        (item) => item.id === feature.properties.siteId,
      );
      if (!site) return;
      setActiveSiteId(site.cameras.length > 1 ? site.id : null);
      if (site.cameras.length === 1) latest.current.onSelect(site.cameras[0]);
    }
  });
  map.on("mousemove", (event) => {
    if (
      latest.current.analysisMode !== "none" ||
      latest.current.incidentPickMode
    )
      map.getCanvas().style.cursor = "crosshair";
    else if (map.getLayer("camera-sites"))
      map.getCanvas().style.cursor = map.queryRenderedFeatures(event.point, {
        layers: ["camera-clusters", "camera-sites"],
      }).length
        ? "pointer"
        : "";
  });
  map.on("moveend", () => {
    const point = map.getCenter();
    latest.current.onViewChange({
      lng: point.lng,
      lat: point.lat,
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    });
  });
}
