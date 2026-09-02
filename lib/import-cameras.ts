import type { Camera } from "./camera.ts";
type Row = Record<string, unknown>;
function object(value: unknown, label: string): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(label + ": expected an object");
  return value as Row;
}
function text(value: unknown, label: string, max = 500): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(label + ": expected non-empty text");
  return value.trim();
}
function number(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(label + ": number out of range");
  return value;
}
function optionalNumber(value: unknown, label: string, min: number, max: number) {
  return value === undefined || value === null ? null : number(value, label, min, max);
}
function boolean(value: unknown, label: string) {
  if (typeof value !== "boolean") throw new Error(label + ": expected a boolean");
  return value;
}
export function publicUrl(value: unknown, label: string) {
  const raw = text(value, label, 2000);
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error(label + ": invalid URL"); }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")
    || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(":")
    || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(url.hostname)) {
    throw new Error(label + ": expected a public HTTPS domain without credentials");
  }
  return url.href;
}
/** Validate at the repository boundary, including generated JSON edited by hand. */
export function validateCameraDataset(value: unknown): Camera[] {
  if (!Array.isArray(value) || value.length > 10000) throw new Error("Dataset must be an array with at most 10000 cameras");
  const ids = new Set<string>();
  return value.map((entry, index) => {
    const row = object(entry, "Camera " + (index + 1));
    const id = text(row.id, "id", 150);
    if (!/^[a-zA-Z0-9._:-]+$/.test(id) || ids.has(id)) throw new Error("Invalid or duplicate camera id: " + id);
    ids.add(id);
    if (row.category !== "public" && row.category !== "its" && row.category !== "city") throw new Error(id + ": invalid category");
    const heading = optionalNumber(row.heading, id + ".heading", 0, 359.999999);
    const fov = optionalNumber(row.fov, id + ".fov", 1, 180);
    const rangeMeters = optionalNumber(row.rangeMeters, id + ".rangeMeters", 1, 5000);
    const opticsVerified = boolean(row.opticsVerified, id + ".opticsVerified");
    if (opticsVerified && [heading, fov, rangeMeters].includes(null)) throw new Error(id + ": verified optics require all three parameters");
    return {
      id, name: text(row.name, id + ".name", 200), street: text(row.street, id + ".street", 200),
      // Opole and nearby approaches; reject swapped coordinates and unrelated cities.
      lat: number(row.lat, id + ".lat", 50.5, 50.85), lng: number(row.lng, id + ".lng", 17.7, 18.15),
      category: row.category, heading, fov, rangeMeters,
      verified: boolean(row.verified, id + ".verified"), opticsVerified,
      sourceLabel: text(row.sourceLabel, id + ".sourceLabel", 200), sourceUrl: publicUrl(row.sourceUrl, id + ".sourceUrl"),
      ...(row.positionSourceUrl === undefined ? {} : { positionSourceUrl: publicUrl(row.positionSourceUrl, id + ".positionSourceUrl") }),
      ...(row.publicViewUrl === undefined ? {} : { publicViewUrl: publicUrl(row.publicViewUrl, id + ".publicViewUrl") }),
      ...(row.note === undefined ? {} : { note: text(row.note, id + ".note", 2000) }),
    };
  });
}
/** A curator's export of the documented public ITS map. This adapter never fetches URLs. */
export function importItsExport(value: unknown): Camera[] {
  const input = object(value, "ITS export");
  if (input.schemaVersion !== 1) throw new Error("Unsupported schemaVersion; expected 1");
  const sourceUrl = publicUrl(input.sourceUrl, "sourceUrl");
  if (new URL(sourceUrl).hostname !== "its.mzd.opole.pl") throw new Error("ITS sourceUrl must refer to the official public ITS Opole portal");
  if (typeof input.retrievedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.retrievedAt)
    || !Number.isFinite(Date.parse(input.retrievedAt)) || new Date(input.retrievedAt).toISOString().slice(0, 10) !== input.retrievedAt) {
    throw new Error("retrievedAt must be a real YYYY-MM-DD date");
  }
  if (!Array.isArray(input.cameras) || input.cameras.length === 0 || input.cameras.length > 10000) {
    throw new Error("ITS export must contain 1–10000 cameras; empty imports cannot erase the dataset");
  }
  return validateCameraDataset(input.cameras.map((entry, index) => {
    const row = object(entry, "ITS row " + (index + 1));
    return {
      id: "its:" + text(row.id, "id", 100), name: row.name, street: row.street,
      lat: row.lat, lng: row.lng, category: "its", heading: row.heading ?? null,
      fov: row.fov ?? null, rangeMeters: row.rangeMeters ?? null,
      verified: false, opticsVerified: false,
      sourceLabel: "ITS Opole · Miejski Zarząd Dróg", sourceUrl,
      ...(row.publicViewUrl === undefined ? {} : { publicViewUrl: row.publicViewUrl }),
      note: "Импорт из публичного источника от " + input.retrievedAt + ". Координаты и параметры требуют проверки.",
    };
  }));
}

/** Observed public /api/cameras GeoJSON. Metadata only; image paths are not followed. */
export function importItsGeoJson(value: unknown): Camera[] {
  const input = object(value, "ITS GeoJSON export");
  if (input.schemaVersion !== 1 || input.format !== "its-geojson-v1") throw new Error("Unsupported ITS GeoJSON format or schemaVersion");
  if (input.sourceUrl !== "https://its.mzd.opole.pl/api/cameras") throw new Error("GeoJSON sourceUrl must be the observed official public camera endpoint");
  const collection = object(input.collection, "collection");
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features) || collection.features.length === 0 || collection.features.length > 10000) {
    throw new Error("Expected a FeatureCollection with 1–10000 cameras");
  }
  const cameras = collection.features.map((entry, index) => {
    const feature = object(entry, "Feature " + (index + 1));
    const geometry = object(feature.geometry, "geometry");
    const properties = object(feature.properties, "properties");
    if (feature.type !== "Feature" || geometry.type !== "Point" || !Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 2) {
      throw new Error("Camera geometry must be a Point with [longitude, latitude]");
    }
    if (typeof properties.id !== "number" || !Number.isSafeInteger(properties.id) || properties.id < 1) throw new Error("Camera id must be a positive safe integer");
    return {
      id: String(properties.id), name: properties.name, street: properties.description,
      lng: geometry.coordinates[0], lat: geometry.coordinates[1],
      publicViewUrl: "https://its.mzd.opole.pl/mapa",
    };
  });
  return importItsExport({ schemaVersion: 1, sourceUrl: input.sourceUrl, retrievedAt: input.retrievedAt, cameras }).map((camera) => ({
    ...camera,
    note: "Координаты и название опубликованы ITS Opole, получены " + input.retrievedAt + ". Точность места установки не проверена. Направление, угол обзора и дальность в источнике не указаны. Просмотр — на карте издателя.",
  }));
}
