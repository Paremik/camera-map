import assert from "node:assert/strict";
import test from "node:test";
import { applyAdminDrafts, parseAdminDrafts, validateAdminPatch } from "../lib/admin-drafts.ts";
import type { Camera } from "../lib/camera.ts";

const camera: Camera = { id: "a", name: "Old", street: "Street", lat: 50.6, lng: 17.9, category: "its", heading: null, fov: null, rangeMeters: null, verified: false, opticsVerified: false, sourceLabel: "Source" };

test("admin patches are validated and applied without changing identity", () => {
  const patch = { name: "New", heading: 90, updatedAt: "2026-09-05T12:00:00.000Z" };
  assert.equal(validateAdminPatch(patch), true);
  const [updated] = applyAdminDrafts([camera], { a: patch });
  assert.equal(updated.name, "New"); assert.equal(updated.heading, 90); assert.equal(updated.id, "a");
});

test("stored drafts reject unknown cameras and unsafe fields", () => {
  const raw = JSON.stringify({ a: { name: "New", updatedAt: "2026-09-05T12:00:00.000Z" }, missing: { name: "X", updatedAt: "2026-09-05T12:00:00.000Z" }, bad: { id: "changed", updatedAt: "2026-09-05T12:00:00.000Z" } });
  assert.deepEqual(Object.keys(parseAdminDrafts(raw, new Set(["a", "bad"]))), ["a"]);
});

test("invalid coordinates and optics are rejected", () => {
  assert.equal(validateAdminPatch({ lat: 100, updatedAt: "2026-09-05T12:00:00.000Z" }), false);
  assert.equal(validateAdminPatch({ fov: 200, updatedAt: "2026-09-05T12:00:00.000Z" }), false);
  assert.equal(validateAdminPatch({ opticsVerified: true, heading: null, fov: null, rangeMeters: null, updatedAt: "2026-09-05T12:00:00.000Z" }), false);
});
