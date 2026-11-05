import assert from "node:assert/strict";
import test from "node:test";
import { fetchIts } from "../lib/its-https.ts";
import { latestItsSnapshot } from "../lib/camera-view.ts";

// Temporary integration probe; remove before merging. Never poll camera images in ordinary unit tests.
test("live ITS chain and published JPEG", { skip: !process.env.GITHUB_ACTIONS }, async () => {
  try {
    const signal = AbortSignal.timeout(20000);
    const endpoint = "https://its.mzd.opole.pl/api/cameras/120/images";
    const metadata = await fetchIts(endpoint, { signal });
    console.log("ITS metadata status", metadata.status);
    assert.equal(metadata.status, 200);
    const snapshot = latestItsSnapshot(await metadata.json(), "its:120", endpoint);
    assert.ok(snapshot);
    const image = await fetchIts(snapshot.url, { signal, headers: { Accept: "image/jpeg" } });
    console.log("ITS image status", image.status, image.headers.get("content-type"));
    assert.equal(image.status, 200);
    await image.body?.cancel();
  } catch (error) {
    const err = error as Error & { cause?: { code?: string; message?: string } };
    console.log("ITS integration failure", err.message, err.cause?.code, err.cause?.message);
    throw error;
  }
});
