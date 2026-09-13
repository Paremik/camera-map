import test from "node:test";
import assert from "node:assert/strict";
import { cameraFreshness, catalogQuality } from "../lib/catalog-governance.ts";
import type { Camera } from "../lib/camera.ts";

const base: Camera = { id: "test:1", name: "Test", street: "Rynek", lat: 50.66, lng: 17.92, category: "city", heading: null, fov: null, rangeMeters: null, verified: false, opticsVerified: false, sourceLabel: "Public source", sourceUrl: "https://example.org/source" };

test("freshness preserves the distinction between source date and independent verification", () => {
  assert.equal(cameraFreshness({ ...base, retrievedAt: "2026-09-03" }).status, "review");
  assert.equal(cameraFreshness({ ...base, verified: true, retrievedAt: "2026-09-03" }).status, "confirmed");
});

test("quality reports field completeness without turning a documented object into a camera", () => {
  const site: Camera = { ...base, id: "site:1", recordKind: "site", cameraCount: null, sourceDate: "2026-09-02", retrievedAt: "2026-09-03", positionSourceUrl: "https://example.org/position" };
  const quality = catalogQuality([{ ...base, heading: 45, fov: 60, rangeMeters: 30 }, site]);
  assert.equal(quality.total, 2);
  assert.equal(quality.direction, 1);
  assert.equal(quality.needsReview.length, 2);
  assert.equal(quality.density[0]?.count, 1);
});
