import type { Camera } from "./camera.ts";

export const adminDraftStorageKey = "opole-camera-map:admin-drafts:v1";

export type CameraAdminPatch = Partial<
  Pick<
    Camera,
    | "name"
    | "street"
    | "lat"
    | "lng"
    | "heading"
    | "fov"
    | "rangeMeters"
    | "verified"
    | "opticsVerified"
    | "note"
  >
> & { updatedAt: string };

export type CameraAdminDrafts = Record<string, CameraAdminPatch>;

const editableKeys = new Set([
  "name",
  "street",
  "lat",
  "lng",
  "heading",
  "fov",
  "rangeMeters",
  "verified",
  "opticsVerified",
  "note",
  "updatedAt",
]);

function finiteInRange(value: unknown, min: number, max: number) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

export function validateAdminPatch(value: unknown): value is CameraAdminPatch {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const patch = value as Record<string, unknown>;
  if (
    typeof patch.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(patch.updatedAt))
  )
    return false;
  if (Object.keys(patch).some((key) => !editableKeys.has(key))) return false;
  if (
    patch.name !== undefined &&
    (typeof patch.name !== "string" || !patch.name.trim())
  )
    return false;
  if (
    patch.street !== undefined &&
    (typeof patch.street !== "string" || !patch.street.trim())
  )
    return false;
  if (patch.note !== undefined && typeof patch.note !== "string") return false;
  if (patch.lat !== undefined && !finiteInRange(patch.lat, -90, 90))
    return false;
  if (patch.lng !== undefined && !finiteInRange(patch.lng, -180, 180))
    return false;
  if (
    patch.heading !== undefined &&
    patch.heading !== null &&
    !finiteInRange(patch.heading, 0, 359.999)
  )
    return false;
  if (
    patch.fov !== undefined &&
    patch.fov !== null &&
    !finiteInRange(patch.fov, 1, 180)
  )
    return false;
  if (
    patch.rangeMeters !== undefined &&
    patch.rangeMeters !== null &&
    !finiteInRange(patch.rangeMeters, 1, 5000)
  )
    return false;
  if (patch.verified !== undefined && typeof patch.verified !== "boolean")
    return false;
  if (
    patch.opticsVerified !== undefined &&
    typeof patch.opticsVerified !== "boolean"
  )
    return false;
  if (
    patch.opticsVerified === true &&
    (typeof patch.heading !== "number" ||
      typeof patch.fov !== "number" ||
      typeof patch.rangeMeters !== "number")
  )
    return false;
  return true;
}

export function parseAdminDrafts(
  raw: string | null,
  knownIds: ReadonlySet<string>,
): CameraAdminDrafts {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([id, patch]) => knownIds.has(id) && validateAdminPatch(patch),
      ),
    );
  } catch {
    return {};
  }
}

export function applyAdminDrafts(
  cameras: readonly Camera[],
  drafts: CameraAdminDrafts,
): Camera[] {
  return cameras.map((camera) => {
    const draft = drafts[camera.id];
    if (!draft) return camera;
    const { updatedAt, ...patch } = draft;
    void updatedAt;
    return { ...camera, ...patch, id: camera.id };
  });
}

export function adminDraftExport(drafts: CameraAdminDrafts) {
  return JSON.stringify(
    { schemaVersion: 1, exportedAt: new Date().toISOString(), patches: drafts },
    null,
    2,
  );
}
