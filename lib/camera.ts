export type CameraCategory = "public" | "its" | "city";
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
  sourceUrl: string;
  positionSourceUrl?: string;
  publicViewUrl?: string;
  note?: string;
};
export const categoryLabels: Record<CameraCategory, string> = {
  public: "Публичный вид", its: "ITS Opole", city: "Городской мониторинг",
};
export type CameraFilters = { query: string; category: CameraCategory | "all"; verifiedOnly: boolean };
function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").toLowerCase();
}
export function filterCameras(cameras: readonly Camera[], filters: CameraFilters) {
  const terms = normalize(filters.query.trim()).split(/\s+/).filter(Boolean);
  return cameras.filter((camera) => {
    const text = normalize(camera.name + " " + camera.street);
    return (filters.category === "all" || camera.category === filters.category)
      && (!filters.verifiedOnly || camera.verified) && terms.every((term) => text.includes(term));
  });
}
// A shared coordinate is a camera site, not several displaced physical cameras.
export function groupCameraSites(cameras: readonly Camera[]) {
  const sites = new Map<string, { id: string; lng: number; lat: number; cameras: Camera[] }>();
  for (const camera of cameras) {
    const id = camera.lng + "," + camera.lat;
    const site = sites.get(id) ?? { id, lng: camera.lng, lat: camera.lat, cameras: [] };
    site.cameras.push(camera);
    sites.set(id, site);
  }
  return [...sites.values()];
}
