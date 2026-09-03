import assert from "node:assert/strict";
import test from "node:test";
import { cameras } from "../data/cameras.ts";
import { latestItsSnapshot, validateSnapshotSource } from "../lib/camera-view.ts";
import { importItsGeoJson, validateCameraDataset } from "../lib/import-cameras.ts";

const endpoint = "https://its.mzd.opole.pl/api/cameras/1/images";
const image = (filename = "fixture.jpg", addTime = "2026-09-03T12:00:00+02:00") => ({ filename, addTime, mimeType: "image/jpeg" });
const source = (path = "/cameras/1/images") => ({
  schemaVersion: 1, format: "its-geojson-v1", sourceUrl: "https://its.mzd.opole.pl/api/cameras", retrievedAt: "2026-09-03",
  collection: { type: "FeatureCollection", features: [{ type: "Feature", properties: { id: 1, name: "Fixture", description: "Fixture street", image: path }, geometry: { type: "Point", coordinates: [17.9, 50.66] } }] },
});

test("town hall view actions point to four distinct publisher players and retain the city source", () => {
  assert.equal(new Set(cameras.map(camera => camera.publicViewUrl)).size, 4);
  assert.ok(cameras.every(camera => camera.publicViewUrl !== camera.sourceUrl));
  assert.equal(cameras.find(camera => camera.id === "ratusz-katedra")?.publicViewUrl, "https://airmax.pl/ratuszopole3.html");
  assert.equal(cameras.find(camera => camera.id === "ratusz-wschod")?.publicViewUrl, "https://airmax.pl/ratuszopole2.html");
});

test("only observed ITS image paths enable viewing; changed or absent paths keep the publisher fallback", () => {
  assert.equal(importItsGeoJson(source())[0].snapshotSourceUrl, endpoint);
  for (const path of ["/cameras/2/images", "https://elsewhere.example/images", "", "/ignored"]) {
    const camera = importItsGeoJson(source(path))[0];
    assert.equal(camera.snapshotSourceUrl, undefined);
    assert.equal(camera.publicViewUrl, "https://its.mzd.opole.pl/mapa");
  }
  for (const url of ["https://its.mzd.opole.pl/api/cameras/2/images", "http://its.mzd.opole.pl/api/cameras/1/images", endpoint + "?url=other", "https://private.example/"]) {
    assert.throws(() => validateSnapshotSource("its:1", url), /snapshotSourceUrl/);
  }
  const camera = importItsGeoJson(source())[0];
  assert.throws(() => validateCameraDataset([{ ...camera, category: "private" }]), /documented ITS/);
  assert.throws(() => validateCameraDataset([{ ...camera, sourceUrl: "https://other.example" }]), /documented ITS/);
});

test("latest snapshot uses publisher timestamps across time zones, not response order or view time", () => {
  const result = latestItsSnapshot({ images: [image("old.jpg"), image("new.jpg", "2026-09-03T10:05:00Z")] }, "its:1", endpoint);
  assert.deepEqual(result, { url: "https://its.mzd.opole.pl/api/camera/image/1/new.jpg", sourceTime: "2026-09-03T10:05:00Z" });
});

test("empty publication is separate from invalid responses and unsafe image paths", () => {
  assert.equal(latestItsSnapshot({ images: [] }, "its:1", endpoint), null);
  for (const value of [null, {}, { images: "wrong" }, { images: [image("../private.jpg")] }, { images: [image("https://other.example/photo.jpg")] }, { images: [image("bad.jpg", "2026-09-03T12:00:00")] }, { images: [{ ...image(), mimeType: "text/html" }] }]) {
    assert.throws(() => latestItsSnapshot(value, "its:1", endpoint));
  }
  assert.throws(() => latestItsSnapshot({ images: [image()] }, "its:2", endpoint), /snapshotSourceUrl/);
});
