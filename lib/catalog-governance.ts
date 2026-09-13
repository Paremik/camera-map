import type { Camera } from "./camera";

export type FreshnessStatus = "confirmed" | "review";
export type Freshness = { status: FreshnessStatus; reviewedAt: string | null; source: string; history: { date: string | null; event: string }[] };

/**
 * A catalogue entry never becomes confirmed merely because its publisher is
 * reachable.  This keeps source provenance distinct from an independent
 * coordinate/optics check.
 */
export function cameraFreshness(camera: Camera): Freshness {
  const reviewedAt = camera.retrievedAt ?? camera.sourceDate ?? null;
  return {
    status: camera.verified ? "confirmed" : "review",
    reviewedAt,
    source: camera.sourceLabel,
    history: [{ date: reviewedAt, event: camera.verified ? "Координаты подтверждены в каталоге" : "Запись добавлена или импортирована из публичного источника" }],
  };
}

export type CatalogQuality = {
  total: number;
  coordinates: number;
  direction: number;
  source: number;
  reviewed: number;
  needsReview: Camera[];
  density: { label: string; count: number }[];
};

export function catalogQuality(cameras: readonly Camera[]): CatalogQuality {
  const cameraRecords = cameras.filter(camera => camera.recordKind !== "site");
  const areas = new Map<string, number>();
  for (const camera of cameraRecords) {
    // Coarse grid is intentionally an infrastructure overview, not a coverage claim.
    const label = `${camera.lat.toFixed(2)}, ${camera.lng.toFixed(2)}`;
    areas.set(label, (areas.get(label) ?? 0) + 1);
  }
  return {
    total: cameras.length,
    coordinates: cameras.filter(camera => Number.isFinite(camera.lat) && Number.isFinite(camera.lng)).length,
    direction: cameras.filter(camera => camera.heading !== null && camera.fov !== null && camera.rangeMeters !== null).length,
    source: cameras.filter(camera => Boolean(camera.sourceLabel)).length,
    reviewed: cameras.filter(camera => Boolean(cameraFreshness(camera).reviewedAt)).length,
    needsReview: cameras.filter(camera => cameraFreshness(camera).status === "review"),
    density: [...areas.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 5),
  };
}

export const catalogApiLicense = {
  code: "MIT",
  data: "Каталог агрегирует сторонние публичные источники. Используйте каждую запись с её sourceUrl и условиями исходного поставщика; данные OpenStreetMap — ODbL.",
};
