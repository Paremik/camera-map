import assert from "node:assert/strict";
import test from "node:test";
import { cameras } from "../data/cameras.ts";
import { filterCameras, groupCameraSites } from "../lib/camera.ts";
import { cameraSector, destinationPoint, sectorsGeoJson, directionGeoJson } from "../lib/geometry.ts";
import { importItsExport, publicUrl, validateCameraDataset } from "../lib/import-cameras.ts";

// Synthetic records for validation tests only. They are never shipped as camera data.
const input = () => ({
  schemaVersion: 1, sourceUrl: "https://its.mzd.opole.pl/mapa", retrievedAt: "2026-09-02",
  cameras: [{ id: "fixture-1", name: "Synthetic test camera", street: "Test fixture", lat: 50.66, lng: 17.92 }],
});
test("seed records retain uncertainty and pass repository validation", () => {
  assert.deepEqual(validateCameraDataset(cameras), cameras);
  assert.ok(cameras.every((camera) => !camera.verified && !camera.opticsVerified));
});
test("search handles Polish diacritics, multiple terms and street names", () => {
  assert.equal(filterCameras(cameras, { query: "sw wojciecha", category: "all", verifiedOnly: false })[0]?.id, "ratusz-wschod");
  assert.equal(filterCameras(cameras, { query: "wieza", category: "all", verifiedOnly: false }).length, 1);
  assert.equal(filterCameras(cameras, { query: "rynek", category: "all", verifiedOnly: false }).length, 4);
});
test("category and verification filters never turn seed views into verified ITS cameras", () => {
  assert.equal(filterCameras(cameras, { query: "", category: "its", verifiedOnly: false }).length, 0);
  assert.equal(filterCameras(cameras, { query: "", category: "all", verifiedOnly: true }).length, 0);
  assert.equal(filterCameras([{ ...cameras[0], verified: true }], { query: "", category: "public", verifiedOnly: true }).length, 1);
});
test("co-located cameras preserve coordinates and remain individually selectable", () => {
  const sites = groupCameraSites(cameras);
  assert.equal(sites.length, 1);
  assert.equal(sites[0].cameras.length, 4);
  assert.equal(sites[0].lng, cameras[0].lng);
  assert.equal(sites[0].lat, cameras[0].lat);
});
test("geodesic bearings use north=0 and east=90, with GeoJSON longitude first", () => {
  const north = destinationPoint(50.66, 17.92, 0, 1000);
  const east = destinationPoint(50.66, 17.92, 90, 1000);
  assert.ok(Math.abs(north[0] - 17.92) < 1e-8);
  assert.ok(north[1] > 50.668 && north[1] < 50.670);
  assert.ok(east[0] > 17.934 && east[0] < 17.935);
  assert.ok(Math.abs(east[1] - 50.66) < 0.00001);
});
test("sectors form closed rings even across the north bearing", () => {
  const ring = cameraSector({ ...cameras[0], heading: 0, fov: 90 })!.geometry.coordinates[0];
  assert.deepEqual(ring[0], ring.at(-1));
  assert.ok(ring[1][0] < cameras[0].lng);
  assert.ok(ring[33][0] > cameras[0].lng);
  assert.ok(ring.flat().every(Number.isFinite));
});
test("unknown optical parameters do not create fictitious sectors or direction", () => {
  const unknown = { ...cameras[0], heading: null, fov: null, rangeMeters: null };
  assert.equal(cameraSector(unknown), null);
  assert.equal(sectorsGeoJson([unknown]).features.length, 0);
  assert.equal(directionGeoJson(unknown).features.length, 0);
  assert.equal(directionGeoJson(cameras[0]).features.length, 1);
});
test("ITS import is deterministic and never auto-verifies a record", () => {
  const imported = importItsExport(input());
  assert.deepEqual(imported, importItsExport(input()));
  assert.equal(imported[0].id, "its:fixture-1");
  assert.equal(imported[0].heading, null);
  assert.equal(imported[0].verified, false);
  assert.equal(imported[0].publicViewUrl, undefined);
});
test("ITS import rejects duplicates, empty replacement and incompatible versions", () => {
  const duplicate = input();
  duplicate.cameras.push(duplicate.cameras[0]);
  assert.throws(() => importItsExport(duplicate), /duplicate/);
  assert.throws(() => importItsExport({ ...input(), cameras: [] }), /1–10000/);
  assert.throws(() => importItsExport({ ...input(), schemaVersion: 2 }), /schemaVersion/);
});
test("ITS import rejects swapped coordinates, nonfinite numbers and invalid dates", () => {
  for (const lat of [17.92, NaN, Infinity, "50.66"]) {
    assert.throws(() => importItsExport({ ...input(), cameras: [{ ...input().cameras[0], lat }] }), /lat/);
  }
  assert.throws(() => importItsExport({ ...input(), retrievedAt: "2026-02-31" }), /retrievedAt/);
});
test("source and view links reject executable URLs, credentials and local endpoints", () => {
  for (const url of ["javascript:alert(1)", "http://its.mzd.opole.pl", "https://user:secret@its.mzd.opole.pl", "https://127.0.0.1", "https://foo.local"]) {
    assert.throws(() => publicUrl(url, "sourceUrl"));
  }
  assert.throws(() => importItsExport({ ...input(), sourceUrl: "https://example.com/map" }), /official/);
  assert.throws(() => importItsExport({ ...input(), cameras: [{ ...input().cameras[0], publicViewUrl: "javascript:alert(1)" }] }));
});
test("validation rejects missing sources, invalid optics and conflicting dataset IDs", () => {
  assert.throws(() => validateCameraDataset([{ ...cameras[0], sourceUrl: "" }]), /sourceUrl/);
  assert.throws(() => validateCameraDataset([{ ...cameras[0], heading: 360 }]), /heading/);
  assert.throws(() => validateCameraDataset([{ ...cameras[0], fov: 0 }]), /fov/);
  assert.throws(() => validateCameraDataset([{ ...cameras[0], rangeMeters: -1 }]), /rangeMeters/);
  assert.throws(() => validateCameraDataset([{ ...cameras[0], heading: null, opticsVerified: true }]), /optics/);
  assert.throws(() => validateCameraDataset([cameras[0], cameras[0]]), /duplicate/);
});
