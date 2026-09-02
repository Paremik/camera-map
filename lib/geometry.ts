import type { Camera } from "./camera.ts";
export type Position = [number, number];
const radians = Math.PI / 180;
export function destinationPoint(lat: number, lng: number, bearing: number, distance: number): Position {
  const d = distance / 6371000;
  const latitude = lat * radians;
  const direction = bearing * radians;
  const nextLat = Math.asin(Math.sin(latitude) * Math.cos(d) + Math.cos(latitude) * Math.sin(d) * Math.cos(direction));
  const nextLng = lng * radians + Math.atan2(Math.sin(direction) * Math.sin(d) * Math.cos(latitude),
    Math.cos(d) - Math.sin(latitude) * Math.sin(nextLat));
  return [nextLng / radians, nextLat / radians];
}
export function cameraSector(camera: Camera) {
  if (camera.heading === null || camera.fov === null || camera.rangeMeters === null) return null;
  const origin: Position = [camera.lng, camera.lat];
  const points: Position[] = [origin];
  for (let i = 0; i <= 32; i++) {
    points.push(destinationPoint(camera.lat, camera.lng, camera.heading - camera.fov / 2 + camera.fov * i / 32, camera.rangeMeters));
  }
  points.push(origin);
  return { type: "Feature" as const, properties: { id: camera.id }, geometry: { type: "Polygon" as const, coordinates: [points] } };
}
export function sectorsGeoJson(cameras: readonly Camera[]) {
  return { type: "FeatureCollection" as const, features: cameras.flatMap((camera) => {
    const sector = cameraSector(camera);
    return sector ? [sector] : [];
  }) };
}
export function directionGeoJson(camera: Camera | null) {
  const features = [];
  if (camera && camera.heading !== null && camera.rangeMeters !== null) {
    features.push({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [
      [camera.lng, camera.lat], destinationPoint(camera.lat, camera.lng, camera.heading, camera.rangeMeters),
    ] } });
  }
  return { type: "FeatureCollection" as const, features };
}
