import type { Camera } from "./camera.ts";
import { latestItsSnapshot, validateSnapshotSource } from "./camera-view.ts";

const responseHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function readBounded(response: Response, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(response.headers.get("content-length")) > limit) {
    await response.body?.cancel();
    throw new Error("ITS response too large");
  }
  if (!response.body) throw new Error("Missing ITS response body");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("ITS response too large");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

/** Relay only the latest published JPEG for a documented ITS camera, after a user request. */
export async function itsSnapshotResponse(camera: Camera, requestSignal: AbortSignal, fetcher: typeof fetch = fetch): Promise<Response> {
  const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(20000)]);
  let stage = "metadata";
  try {
    signal.throwIfAborted();
    if (camera.category !== "its") throw new Error("Not an ITS camera");
    const source = validateSnapshotSource(camera.id, camera.snapshotSourceUrl);
    const options: RequestInit = { signal, credentials: "omit", cache: "no-store", redirect: "error" };
    const metadata = await fetcher(source, { ...options, headers: { Accept: "application/json" } });
    if (!metadata.ok) throw new Error("ITS metadata request failed");
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readBounded(metadata, 128 * 1024)));
    const snapshot = latestItsSnapshot(value, camera.id, source);
    if (!snapshot) return new Response(null, { status: 204, headers: responseHeaders });
    signal.throwIfAborted();
    stage = "image";
    const image = await fetcher(snapshot.url, { ...options, headers: { Accept: "image/jpeg" } });
    if (!image.ok || !/^image\/jpeg(?:;|$)/i.test(image.headers.get("content-type") ?? "")) {
      await image.body?.cancel();
      throw new Error("ITS image request failed");
    }
    const bytes = await readBounded(image, 4 * 1024 * 1024);
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error("Not a JPEG");
    return new Response(bytes, { headers: { ...responseHeaders, "Content-Type": "image/jpeg", "X-Snapshot-Source-Time": snapshot.sourceTime } });
  } catch (error) {
    const cause = error instanceof Error && error.cause && typeof error.cause === "object" ? error.cause as { code?: unknown } : null;
    const tlsFailure = typeof cause?.code === "string" && /^(UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_GET_ISSUER_CERT_LOCALLY|CERT_HAS_EXPIRED|SELF_SIGNED_CERT_IN_CHAIN|DEPTH_ZERO_SELF_SIGNED_CERT|ERR_TLS_CERT_ALTNAME_INVALID)$/.test(cause.code);
    const code = signal.aborted ? "snapshot_timeout" : tlsFailure ? "snapshot_tls_error" : "snapshot_unavailable";
    console.warn("ITS snapshot relay failed", { cameraId: camera.id, stage, code });
    return Response.json({ error: code }, { status: signal.aborted ? 504 : 502, headers: responseHeaders });
  }
}
