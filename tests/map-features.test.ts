import test from "node:test";
import assert from "node:assert/strict";
import { cameraLayer, coverageGeoJson } from "../lib/map-features.ts";
import { approximateRoadCoverageGeoJson } from "../lib/geometry.ts";
import type { Camera } from "../lib/camera.ts";

const base: Camera = { id: "x", name: "Camera", street: "Street", lat: 50.67, lng: 17.92, category: "city", heading: null, fov: null, rangeMeters: null, verified: false, opticsVerified: false, sourceLabel: "source" };

test("map layers form a stable partition for ITS, parking, police and user reports", () => {
  assert.equal(cameraLayer({ ...base, category: "its" }), "its");
  assert.equal(cameraLayer({ ...base, name: "Parking Chabrów" }), "parking");
  assert.equal(cameraLayer({ ...base, name: "Komenda Policji" }), "police");
  assert.equal(cameraLayer({ ...base, category: "private" }), "private");
  assert.equal(cameraLayer({ ...base, sourceKind: "user-report" }), "reported");
});

test("coverage disclaimer is shown only when at least one visible camera has complete optics", () => {
  assert.equal(coverageGeoJson([base]).features.length, 0);
  const result = coverageGeoJson([{ ...base, heading: 90, fov: 55, rangeMeters: 200 }]);
  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].properties.kind, "unknown");
});

test("unknown directions create a neutral circle instead of invented sectors", () => {
  const unknownIts = { ...base, category: "its" as const };
  const result = approximateRoadCoverageGeoJson([unknownIts, { ...unknownIts, id: "second" }, { ...unknownIts, id: "known", heading: 90, fov: 50, rangeMeters: 100 }]);
  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].properties.kind, "estimated-unknown-direction");
  assert.equal(result.features[0].properties.cameraCount, 2);
  assert.equal(result.features[0].properties.rangeMeters, 75);
  assert.equal(result.features[0].properties.heading, null);
  assert.equal(result.features[0].geometry.coordinates[0].length, 65);
});

test("a source heading orients an estimated wedge without claiming verified optics", () => {
  const directed = { ...base, id: "osm:directed", category: "other" as const, heading: 253 };
  const result = approximateRoadCoverageGeoJson([directed]);
  assert.equal(result.features[0].properties.kind, "source-heading-estimated-optics");
  assert.equal(result.features[0].properties.heading, 253);
  assert.equal(result.features[0].properties.fov, 70);
  assert.equal(result.features[0].geometry.coordinates[0].length, 27);
});

test("a documented monitoring site gets a blue circle without inventing a camera count", () => {
  const site = { ...base, id: "site:dip", recordKind: "site" as const, cameraCount: null };
  const result = approximateRoadCoverageGeoJson([site]);
  assert.equal(result.features.length, 1);
  assert.equal(result.features[0].properties.kind, "documented-site-unknown-area");
  assert.equal(result.features[0].properties.cameraCount, 0);
  assert.equal(result.features[0].properties.heading, null);
  assert.equal(result.features[0].geometry.coordinates[0].length, 65);
});
