import type { CameraLayer } from "./map-features.ts";

export type MapView = { lng: number; lat: number; zoom: number; bearing: number; pitch: number };
export type ShareState = { cameraId: string | null; layers: ReadonlySet<CameraLayer>; is3D: boolean; theme: "light" | "dark"; coverage: boolean; heatmap: boolean; droneZones: boolean; street: string | null; view: MapView };
const validLayers: CameraLayer[] = ["its", "public", "city", "private", "parking", "police", "reported", "other"];
const finite = (value: string | null, min: number, max: number) => { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null; };

export function mapShareLink(currentUrl: string, state: ShareState): string {
  const url = new URL(currentUrl); url.search = ""; url.hash = "";
  if (state.cameraId) url.searchParams.set("camera", state.cameraId);
  url.searchParams.set("layers", [...state.layers].join(","));
  if (state.is3D) url.searchParams.set("mode", "3d");
  if (state.theme === "dark") url.searchParams.set("theme", "dark");
  if (state.coverage) url.searchParams.set("coverage", "1");
  if (state.heatmap) url.searchParams.set("heatmap", "1");
  if (state.droneZones) url.searchParams.set("drone", "1");
  if (state.street) url.searchParams.set("street", state.street);
  url.searchParams.set("view", [state.view.lng.toFixed(5), state.view.lat.toFixed(5), state.view.zoom.toFixed(2), state.view.bearing.toFixed(1), state.view.pitch.toFixed(1)].join(","));
  return url.href;
}

export function readMapShareState(search: string) {
  const params = new URLSearchParams(search);
  const layerValue = params.get("layers");
  const layerParts = layerValue?.split(",").filter((value): value is CameraLayer => validLayers.includes(value as CameraLayer));
  const rawView = params.get("view")?.split(",") ?? [];
  const viewValues = [finite(rawView[0] ?? null, 17.7, 18.15), finite(rawView[1] ?? null, 50.5, 50.85), finite(rawView[2] ?? null, 10, 19), finite(rawView[3] ?? null, -180, 180), finite(rawView[4] ?? null, 0, 70)];
  return {
    layers: layerValue !== null && layerParts?.length ? new Set(layerParts) : null,
    is3D: params.get("mode") === "3d", theme: params.get("theme") === "dark" ? "dark" as const : null,
    coverage: params.get("coverage") === "1",
    heatmap: params.get("heatmap") === "1",
    droneZones: params.get("drone") === "1",
    street: (params.get("street")?.trim().slice(0, 80) || null),
    view: viewValues.every(value => value !== null) ? { lng: viewValues[0]!, lat: viewValues[1]!, zoom: viewValues[2]!, bearing: viewValues[3]!, pitch: viewValues[4]! } : null,
  };
}
