import test from "node:test";
import assert from "node:assert/strict";
import { cameraLayer, coverageGeoJson } from "../lib/map-features.ts";
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
