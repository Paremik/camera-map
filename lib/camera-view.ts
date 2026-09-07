const itsOrigin = "https://its.mzd.opole.pl";

/** Only the per-camera endpoint published by the official ITS map is supported. */
export function validateSnapshotSource(
  cameraId: string,
  sourceUrl: unknown,
): string {
  const id = /^its:([1-9]\d*)$/.exec(cameraId)?.[1];
  if (
    !id ||
    !Number.isSafeInteger(Number(id)) ||
    sourceUrl !== `${itsOrigin}/api/cameras/${id}/images`
  ) {
    throw new Error(
      cameraId + ": snapshotSourceUrl must match the official ITS camera ID",
    );
  }
  return sourceUrl as string;
}

export type CameraSnapshot = { url: string; sourceTime: string };

/** A filename is an opaque segment, never an arbitrary URL or network address. */
export function latestItsSnapshot(
  value: unknown,
  cameraId: string,
  sourceUrl: string,
): CameraSnapshot | null {
  validateSnapshotSource(cameraId, sourceUrl);
  if (
    !value ||
    typeof value !== "object" ||
    !("images" in value) ||
    !Array.isArray(value.images) ||
    value.images.length > 100
  ) {
    throw new Error("Unexpected ITS image response");
  }
  if (value.images.length === 0) return null;
  const images = value.images.filter(
    (entry): entry is { filename: string; addTime: string } => {
      if (!entry || typeof entry !== "object") return false;
      return (
        typeof entry.filename === "string" &&
        entry.filename.length <= 255 &&
        /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.jpe?g$/i.test(entry.filename) &&
        !entry.filename.includes("..") &&
        entry.mimeType === "image/jpeg" &&
        typeof entry.addTime === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
          entry.addTime,
        ) &&
        Number.isFinite(Date.parse(entry.addTime))
      );
    },
  );
  if (!images.length) throw new Error("No valid ITS images in response");
  const latest = images.reduce((a, b) =>
    Date.parse(a.addTime) >= Date.parse(b.addTime) ? a : b,
  );
  return {
    url: `${itsOrigin}/api/camera/image/${cameraId.slice(4)}/${encodeURIComponent(latest.filename)}`,
    sourceTime: latest.addTime,
  };
}
