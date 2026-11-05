import assert from "node:assert/strict";
import test from "node:test";
import type { Camera } from "../lib/camera.ts";
import { itsSnapshotResponse } from "../lib/its-snapshot.ts";

const camera: Camera = { id: "its:120", name: "S36_CCTV1.2", street: "Fixture", lat: 50.66, lng: 17.91, category: "its", heading: null, fov: null, rangeMeters: null, verified: false, opticsVerified: false, sourceLabel: "ITS Opole", sourceUrl: "https://its.mzd.opole.pl/api/cameras", snapshotSourceUrl: "https://its.mzd.opole.pl/api/cameras/120/images" };
const sourceTime = "2026-11-05T01:07:44+01:00";
const filename = "11.136.102.2_20261105-01074456_Schedule.jpg";
const metadata = () => Response.json({ images: [{ filename, addTime: sourceTime, mimeType: "image/jpeg" }] });
const jpeg = () => new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), { headers: { "Content-Type": "image/jpeg" } });

test("snapshot relay uses published metadata and JPEG with publisher time and no stored cookies", async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input, options) => {
    calls.push(String(input));
    assert.equal(options?.credentials, "omit");
    assert.equal(options?.redirect, "error");
    assert.equal(options?.cache, "no-store");
    assert.ok(options?.signal);
    return calls.length === 1 ? metadata() : jpeg();
  };
  const response = await itsSnapshotResponse(camera, new AbortController().signal, fetcher);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Snapshot-Source-Time"), sourceTime);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(calls, [camera.snapshotSourceUrl, `https://its.mzd.opole.pl/api/camera/image/120/${filename}`]);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([0xff, 0xd8, 0xff, 0xe0]));
});

test("empty publication makes no image request", async () => {
  let calls = 0;
  const response = await itsSnapshotResponse(camera, new AbortController().signal, async () => { calls++; return Response.json({ images: [] }); });
  assert.equal(response.status, 204);
  assert.equal(calls, 1);
});

test("relay never requests arbitrary hosts, mismatched IDs or unpublished paths", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return metadata(); };
  for (const invalid of [{ ...camera, snapshotSourceUrl: "https://private.example/" }, { ...camera, id: "its:121" }, { ...camera, category: "private" as const }]) {
    assert.equal((await itsSnapshotResponse(invalid, new AbortController().signal, fetcher)).status, 502);
  }
  assert.equal(calls, 0);
  const response = await itsSnapshotResponse(camera, new AbortController().signal, async () => {
    calls++;
    return Response.json({ images: [{ filename: "../private.jpg", addTime: sourceTime, mimeType: "image/jpeg" }] });
  });
  assert.equal(response.status, 502);
  assert.equal(calls, 1);
});

test("relay rejects HTML, non-JPEG bytes and oversized responses", async () => {
  for (const invalid of [new Response("<html>error</html>", { headers: { "Content-Type": "text/html" } }), new Response("not jpeg", { headers: { "Content-Type": "image/jpeg" } }), new Response("bad", { headers: { "Content-Type": "image/jpeg", "Content-Length": String(5 * 1024 * 1024) } }), new Response(new Uint8Array(4 * 1024 * 1024 + 1), { headers: { "Content-Type": "image/jpeg" } })]) {
    let calls = 0;
    const response = await itsSnapshotResponse(camera, new AbortController().signal, async () => ++calls === 1 ? metadata() : invalid);
    assert.equal(response.status, 502);
  }
});

test("network and cancellation failures remain transport errors without leaking upstream details", async () => {
  const response = await itsSnapshotResponse(camera, new AbortController().signal, async () => { throw new Error("TLS certificate failure with private diagnostic text"); });
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "snapshot_unavailable" });
  const controller = new AbortController();
  controller.abort();
  const cancelled = await itsSnapshotResponse(camera, controller.signal, async () => { throw new Error("must not fetch"); });
  assert.equal(cancelled.status, 504);
});
