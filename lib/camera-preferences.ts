export const FAVORITES_KEY = "opole-camera-map:favorites:v1";

export function readFavorites(raw: string | null, knownIds: ReadonlySet<string>): string[] {
  if (!raw || raw.length > 2_000_000) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 ||
        !("ids" in value) || !Array.isArray(value.ids) || value.ids.length > 10_000) return [];
    return [...new Set(value.ids.filter((id): id is string => typeof id === "string" && knownIds.has(id)))];
  } catch {
    return [];
  }
}

export function writeFavorites(ids: readonly string[]): string {
  return JSON.stringify({ version: 1, ids: [...new Set(ids)] });
}

export function readCameraLink(search: string, knownIds: ReadonlySet<string>): { id: string | null; invalid: boolean } {
  const params = new URLSearchParams(search);
  const ids = params.getAll("camera");
  if (ids.length === 0) return { id: null, invalid: false };
  if (ids.length !== 1 || !knownIds.has(ids[0])) return { id: null, invalid: true };
  return { id: ids[0], invalid: false };
}

// Navigation preserves unrelated URL state; a copied link only contains the camera.
export function cameraLink(currentUrl: string, id: string | null, share = false): string {
  const url = new URL(currentUrl);
  if (share) { url.search = ""; url.hash = ""; }
  if (id === null) url.searchParams.delete("camera");
  else url.searchParams.set("camera", id);
  return url.href;
}

export function isLocalLink(url: string): boolean {
  const hostname = new URL(url).hostname;
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "[::1]";
}
