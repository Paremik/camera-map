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

// Public catalog records usually omit lens angle and range. A published heading can
// still orient an estimated wedge. Without a heading, a circle communicates only a
// possible nearby area and deliberately avoids inventing a viewing direction.
export function approximateRoadCoverageGeoJson(cameras: readonly Camera[]) {
  const sites = new Map<string, Camera[]>();
  for (const camera of cameras) {
    if (camera.heading !== null && camera.fov !== null && camera.rangeMeters !== null) continue;
    const key = `${camera.lng},${camera.lat}`;
    sites.set(key, [...(sites.get(key) ?? []), camera]);
  }
  return {
    type: "FeatureCollection" as const,
    features: [...sites.values()].flatMap((site) => {
      const directed = site.filter((camera) => camera.recordKind !== "site" && camera.heading !== null).map((camera) => {
        const heading = camera.heading!;
        const fov = 70;
        const rangeMeters = 75;
        const origin: Position = [camera.lng, camera.lat];
        const ring: Position[] = [origin];
        for (let i = 0; i <= 24; i++) ring.push(destinationPoint(camera.lat, camera.lng, heading - fov / 2 + fov * i / 24, rangeMeters));
        ring.push(origin);
        return {
          type: "Feature" as const,
          properties: { kind: "source-heading-estimated-optics", cameraId: camera.id, cameraCount: camera.reportedCount ?? 1, heading, fov, rangeMeters },
          geometry: { type: "Polygon" as const, coordinates: [ring] },
        };
      });
      const unknown = site.filter((camera) => camera.heading === null);
      if (!unknown.length) return directed;
      const rangeMeters = 75;
      const origin = unknown[0];
      const kind = unknown.every((camera) => camera.recordKind === "site") ? "documented-site-unknown-area" : "estimated-unknown-direction";
      const ring: Position[] = [];
      for (let index = 0; index < 64; index++) ring.push(destinationPoint(origin.lat, origin.lng, index * 360 / 64, rangeMeters));
      ring.push(ring[0]);
      return [...directed, {
        type: "Feature" as const,
        properties: { kind, cameraId: unknown.map((camera) => camera.id).join(","), cameraCount: unknown.reduce((total, camera) => total + (camera.recordKind === "site" ? camera.cameraCount ?? 0 : camera.reportedCount ?? 1), 0), heading: null, fov: null, rangeMeters },
        geometry: { type: "Polygon" as const, coordinates: [ring] },
      }];
    }),
  };
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
