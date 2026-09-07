import type { Camera } from "./camera.ts";

export type CameraLayer =
  | "its"
  | "public"
  | "city"
  | "private"
  | "parking"
  | "police"
  | "reported"
  | "other";
export const cameraLayers: CameraLayer[] = [
  "its",
  "public",
  "city",
  "private",
  "parking",
  "police",
  "reported",
  "other",
];
export function cameraLayer(camera: Camera): CameraLayer {
  if (camera.sourceKind === "user-report") return "reported";
  if (camera.category === "its") return "its";
  if (camera.category === "public") return "public";
  const text = (
    camera.name +
    " " +
    camera.street +
    " " +
    camera.sourceLabel
  ).toLocaleLowerCase("pl");
  if (/parking|park & ride|park and ride/.test(text)) return "parking";
  if (/policj|komend/.test(text)) return "police";
  if (camera.category === "city") return "city";
  if (camera.category === "private") return "private";
  return "other";
}
export type Availability = "working" | "unavailable" | "unknown";
export type CameraAvailability = {
  status: Availability;
  checkedAt?: string;
  sourceTime?: string;
};

export function coverageGeoJson(cameras: readonly Camera[]) {
  const hasOptics = cameras.some(
    (camera) =>
      camera.heading !== null &&
      camera.fov !== null &&
      camera.rangeMeters !== null,
  );
  return {
    type: "FeatureCollection" as const,
    features: hasOptics
      ? [
          {
            type: "Feature" as const,
            properties: { kind: "unknown" },
            geometry: {
              type: "Polygon" as const,
              coordinates: [
                [
                  [17.7, 50.5],
                  [18.15, 50.5],
                  [18.15, 50.85],
                  [17.7, 50.85],
                  [17.7, 50.5],
                ],
              ],
            },
          },
        ]
      : [],
  };
}
