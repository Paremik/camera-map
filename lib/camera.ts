export type CameraCategory = "public" | "its" | "city" | "private" | "other";
export type Camera = {
  id: string;
  name: string;
  street: string;
  lat: number;
  lng: number;
  category: CameraCategory;
  heading: number | null;
  fov: number | null;
  rangeMeters: number | null;
  verified: boolean;
  opticsVerified: boolean;
  sourceLabel: string;
  sourceUrl?: string;
  sourceKind?: "user-report" | "open-map";
  reportedCount?: number;
  // An object is an approximate anchor, not a surveyed camera mount.
  recordKind?: "site";
  cameraCount?: number | null;
  sourceDate?: string;
  retrievedAt?: string;
  positionSourceUrl?: string;
  positionSourceLabel?: string;
  publicViewUrl?: string;
  note?: string;
};
export const categoryLabels: Record<CameraCategory, string> = {
  public: "Публичный вид", its: "ITS Opole", city: "Городские и общественные", private: "Частные камеры", other: "Оператор неизвестен",
};
export function cameraCategoryLabel(camera: Camera): string {
  return camera.category === "private" && camera.sourceKind === "user-report" ? "Предположительно частные" : categoryLabels[camera.category];
}
export function countCameras(cameras: readonly Camera[]): number {
  // Object totals may overlap individual records or other systems; do not add them.
  return cameras.reduce((total, camera) => total + (camera.recordKind === "site" ? 0 : camera.reportedCount ?? 1), 0);
}
export function countDocumentedSites(cameras: readonly Camera[]): number {
  return cameras.filter((camera) => camera.recordKind === "site").length;
}
export function catalogCountLabel(cameras: readonly Camera[]): string {
  const sites = countDocumentedSites(cameras);
  return countCameras(cameras) + (sites ? " + " + sites + " объектов" : "");
}
export type CameraFilters = { query: string; category: CameraCategory | "all"; verifiedOnly: boolean };
function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").toLowerCase();
}
export function filterCameras(cameras: readonly Camera[], filters: CameraFilters) {
  const terms = normalize(filters.query.trim()).split(/\s+/).filter(Boolean);
  return cameras.filter((camera) => {
    const text = normalize(camera.name + " " + camera.street + " " + camera.sourceLabel);
    return (filters.category === "all" || camera.category === filters.category)
      && (!filters.verifiedOnly || camera.verified) && terms.every((term) => text.includes(term));
  });
}
// A shared coordinate is a camera site, not several displaced physical cameras.
export function groupCameraSites(cameras: readonly Camera[]) {
  const sites = new Map<string, { id: string; lng: number; lat: number; cameras: Camera[]; cameraCount: number; reportedCount: number; documentedSiteCount: number }>();
  for (const camera of cameras) {
    const id = camera.lng + "," + camera.lat;
    const site = sites.get(id) ?? { id, lng: camera.lng, lat: camera.lat, cameras: [], cameraCount: 0, reportedCount: 0, documentedSiteCount: 0 };
    site.cameras.push(camera);
    site.cameraCount += countCameras([camera]);
    if (camera.recordKind === "site") site.documentedSiteCount += 1;
    if (camera.sourceKind === "user-report") site.reportedCount += camera.reportedCount ?? 1;
    sites.set(id, site);
  }
  return [...sites.values()];
}
