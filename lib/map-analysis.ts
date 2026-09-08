import { countCameras, type Camera } from "./camera.ts";

export type LngLat = [number, number];
export type AnalysisMode = "none" | "area" | "route";
export type AnalysisSelection = {
  mode: Exclude<AnalysisMode, "none">;
  points: [LngLat, LngLat];
};

const earthRadius = 6_371_000;
const radians = (value: number) => (value * Math.PI) / 180;

export function boundsFromPoints([a, b]: [LngLat, LngLat]): [
  number,
  number,
  number,
  number,
] {
  return [
    Math.min(a[0], b[0]),
    Math.min(a[1], b[1]),
    Math.max(a[0], b[0]),
    Math.max(a[1], b[1]),
  ];
}

export function camerasInArea(
  cameras: readonly Camera[],
  points: [LngLat, LngLat],
): Camera[] {
  const [west, south, east, north] = boundsFromPoints(points);
  return cameras.filter(
    (camera) =>
      camera.lng >= west &&
      camera.lng <= east &&
      camera.lat >= south &&
      camera.lat <= north,
  );
}

function localMeters(point: LngLat, origin: LngLat): [number, number] {
  const latitude = radians((point[1] + origin[1]) / 2);
  return [
    radians(point[0] - origin[0]) * earthRadius * Math.cos(latitude),
    radians(point[1] - origin[1]) * earthRadius,
  ];
}

export function distanceToSegmentMeters(
  point: LngLat,
  start: LngLat,
  end: LngLat,
): number {
  const [px, py] = localMeters(point, start);
  const [ex, ey] = localMeters(end, start);
  const lengthSquared = ex * ex + ey * ey;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, (px * ex + py * ey) / lengthSquared));
  return Math.hypot(px - t * ex, py - t * ey);
}

export function camerasNearRoute(
  cameras: readonly Camera[],
  points: [LngLat, LngLat],
  corridorMeters = 100,
): Camera[] {
  return cameras.filter(
    (camera) =>
      distanceToSegmentMeters([camera.lng, camera.lat], points[0], points[1]) <=
      corridorMeters,
  );
}

export function selectionCameras(
  cameras: readonly Camera[],
  selection: AnalysisSelection | null,
): Camera[] {
  if (!selection) return [];
  return selection.mode === "area"
    ? camerasInArea(cameras, selection.points)
    : camerasNearRoute(cameras, selection.points);
}

export function analysisSummary(cameras: readonly Camera[]) {
  return {
    cameras: countCameras(cameras),
    records: cameras.length,
    verified: countCameras(cameras.filter((camera) => camera.verified)),
    publicViews: cameras.filter(
      (camera) => camera.publicViewUrl || camera.snapshotSourceUrl,
    ).length,
    unknownOptics: cameras.filter(
      (camera) =>
        camera.recordKind !== "site" &&
        (camera.heading === null ||
          camera.fov === null ||
          camera.rangeMeters === null),
    ).length,
  };
}

function csvCell(value: string | number | boolean | null | undefined) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function camerasCsv(cameras: readonly Camera[]): string {
  const fields = [
    "id",
    "name",
    "street",
    "latitude",
    "longitude",
    "category",
    "verified",
    "source",
  ];
  return [
    fields.join(","),
    ...cameras.map((camera) =>
      [
        camera.id,
        camera.name,
        camera.street,
        camera.lat,
        camera.lng,
        camera.category,
        camera.verified,
        camera.sourceLabel,
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");
}

export function camerasGeoJson(cameras: readonly Camera[]) {
  return {
    type: "FeatureCollection" as const,
    features: cameras.map((camera) => ({
      type: "Feature" as const,
      properties: {
        id: camera.id,
        name: camera.name,
        street: camera.street,
        category: camera.category,
        verified: camera.verified,
        source: camera.sourceLabel,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [camera.lng, camera.lat] as LngLat,
      },
    })),
  };
}

export function selectionGeoJson(selection: AnalysisSelection | null) {
  if (!selection) return { type: "FeatureCollection" as const, features: [] };
  const [a, b] = selection.points;
  if (selection.mode === "route")
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { kind: "route", corridorMeters: 100 },
          geometry: { type: "LineString" as const, coordinates: [a, b] },
        },
      ],
    };
  const [west, south, east, north] = boundsFromPoints(selection.points);
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: { kind: "area" },
        geometry: {
          type: "Polygon" as const,
          coordinates: [
            [
              [west, south],
              [east, south],
              [east, north],
              [west, north],
              [west, south],
            ],
          ],
        },
      },
    ],
  };
}
