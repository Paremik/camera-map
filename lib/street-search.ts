export type StreetHighlight = {
  name: string;
  bbox: [number, number, number, number];
  geometry: { type: "FeatureCollection"; features: Array<{
    type: "Feature";
    properties: { id: string; name: string };
    geometry: { type: "LineString"; coordinates: number[][] } | { type: "MultiLineString"; coordinates: number[][][] };
  }> };
};

const opoleBounds = { minLng: 17.7, minLat: 50.5, maxLng: 18.15, maxLat: 50.85 };

function row(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").toLowerCase().trim();
}
function validPoint(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite)
    && value[0] >= opoleBounds.minLng && value[0] <= opoleBounds.maxLng
    && value[1] >= opoleBounds.minLat && value[1] <= opoleBounds.maxLat;
}
function line(value: unknown): number[][] | null {
  return Array.isArray(value) && value.length >= 2 && value.length <= 10000 && value.every(validPoint) ? value : null;
}
function multiLine(value: unknown): number[][][] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 1000) return null;
  const lines = value.map(line);
  return lines.every(Boolean) && lines.reduce((total, item) => total + item!.length, 0) <= 20000 ? lines as number[][][] : null;
}

/** Reduce a third-party response to named Opole road geometry only. */
export function parseStreetResponse(value: unknown): StreetHighlight | null {
  const collection = row(value);
  if (collection?.type !== "FeatureCollection" || !Array.isArray(collection.features) || collection.features.length > 50) throw new Error("Unexpected geocoder response");
  const candidates: StreetHighlight["geometry"]["features"] = [];
  collection.features.forEach((item, index) => {
    const feature = row(item), properties = row(feature?.properties), geometry = row(feature?.geometry);
    const name = typeof properties?.name === "string" ? properties.name.trim() : "";
    if (!name || name.length > 200 || properties?.category !== "highway" || properties?.addresstype !== "road") return;
    if (geometry?.type === "LineString") {
      const coordinates = line(geometry.coordinates);
      if (coordinates) candidates.push({ type: "Feature", properties: { id: String(properties.osm_type ?? "") + String(properties.osm_id ?? index), name }, geometry: { type: "LineString", coordinates } });
      return;
    }
    if (geometry?.type === "MultiLineString") {
      const coordinates = multiLine(geometry.coordinates);
      if (coordinates) candidates.push({ type: "Feature", properties: { id: String(properties.osm_type ?? "") + String(properties.osm_id ?? index), name }, geometry: { type: "MultiLineString", coordinates } });
    }
  });
  if (!candidates.length) return null;
  const pointCount = candidates.reduce((total, feature) => total + (feature.geometry.type === "LineString" ? feature.geometry.coordinates.length : feature.geometry.coordinates.reduce((sum, segment) => sum + segment.length, 0)), 0);
  if (pointCount > 50000) throw new Error("Street geometry is too large");
  const name = candidates[0].properties.name;
  const features = candidates.filter(feature => normalized(feature.properties.name) === normalized(name));
  const points = features.flatMap(feature => feature.geometry.type === "LineString" ? feature.geometry.coordinates : feature.geometry.coordinates.flat());
  const lngs = points.map(point => point[0]), lats = points.map(point => point[1]);
  return { name, bbox: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)], geometry: { type: "FeatureCollection", features } };
}

export function streetSearchUrl(baseUrl: string, street: string): URL {
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Street geocoder must use public HTTPS");
  url.search = "";
  for (const [key, value] of Object.entries({ street, city: "Opole", country: "Polska", countrycodes: "pl", format: "geojson", polygon_geojson: "1", polygon_threshold: "0.00001", addressdetails: "1", layer: "address", bounded: "1", viewbox: "17.70,50.85,18.15,50.50", limit: "50", dedupe: "0" })) url.searchParams.set(key, value);
  return url;
}
