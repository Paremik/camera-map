import assert from "node:assert/strict";
import test from "node:test";
import {
  incidentDistanceMeters,
  insuranceCandidates,
  insuranceCaseExport,
  preservationRequest,
} from "../lib/insurance-case.ts";
import type { Camera } from "../lib/camera.ts";

const camera = (
  id: string,
  lng: number,
  lat: number,
  extra: Partial<Camera> = {},
): Camera => ({
  id,
  name: id,
  street: "Street",
  lng,
  lat,
  category: "its",
  heading: null,
  fov: null,
  rangeMeters: null,
  verified: false,
  opticsVerified: false,
  sourceLabel: "Source",
  ...extra,
});

test("insurance search ranks nearby public sources and preserves uncertainty", () => {
  const point = { lng: 17.92, lat: 50.67 };
  const publicCamera = camera("public", 17.9205, 50.67, {
    publicViewUrl: "https://example.test/view",
  });
  const far = camera("far", 17.94, 50.67);
  const candidates = insuranceCandidates([publicCamera, far], point, 100);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].priority, "high");
  assert.match(candidates[0].reason, /историческ/);
  assert.ok(incidentDistanceMeters(point, publicCamera) > 20);
});

test("insurance export includes provenance and does not claim footage", () => {
  const point = { lng: 17.92, lat: 50.67 };
  const candidates = insuranceCandidates(
    [camera("one", 17.9201, 50.67)],
    point,
    100,
  );
  const exported = insuranceCaseExport(
    point,
    "2026-09-06T10:20",
    "CASE-1",
    100,
    candidates,
  );
  assert.equal(exported.candidates[0].source, "Source");
  assert.match(exported.disclaimer, /Не подтверждает/);
  assert.match(
    preservationRequest(candidates[0], "2026-09-06T10:20", "CASE-1"),
    /сохранению записи/,
  );
});
