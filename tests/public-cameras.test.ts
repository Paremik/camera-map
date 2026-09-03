import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cameras as seeds } from "../data/cameras.ts";
import { reportedCameras } from "../data/reported-cameras.ts";
import { countCameras, countDocumentedSites, filterCameras, groupCameraSites } from "../lib/camera.ts";
import { validateCameraDataset } from "../lib/import-cameras.ts";
import { sectorsGeoJson } from "../lib/geometry.ts";

const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const additions = validateCameraDataset(read("../data/public-cameras.json"));
const catalog = validateCameraDataset([...seeds, ...read("../data/its-cameras.json"), ...reportedCameras, ...additions]);
const objects = additions.filter((camera) => camera.recordKind === "site");
const arena = objects.find((camera) => camera.id === "site:itaka-arena")!;

test("public inventory keeps objects and individual cameras separate without changing existing IDs", () => {
  assert.equal(catalog.length, 225);
  assert.equal(countCameras(catalog), 175);
  assert.equal(countDocumentedSites(catalog), 53);
  assert.equal(additions.filter((camera) => camera.id.startsWith("site:dip-")).length, 35);
  assert.equal(countCameras(additions), 8);
  assert.equal(arena.cameraCount, 192);
  assert.equal(arena.sourceDate, "2025-03-21");
  assert.equal(objects.filter((camera) => camera.cameraCount === null).length, 51);
  assert.equal(sectorsGeoJson(additions).features.length, 0);
});

test("object counts cannot inflate totals or markers even when co-located with a reported group", () => {
  const report = reportedCameras[0];
  const group = groupCameraSites([report, { ...arena, lat: report.lat, lng: report.lng }, { ...objects[0], lat: report.lat, lng: report.lng }])[0];
  assert.equal(group.cameraCount, 4);
  assert.equal(group.reportedCount, 4);
  assert.equal(group.documentedSiteCount, 2);
  assert.equal(group.cameras.length, 3);
  assert.equal(countCameras(objects), 0);
});

test("unknown object counts stay null; known counts require dates and all objects need position provenance", () => {
  for (const patch of [
    { cameraCount: undefined }, { cameraCount: 0 }, { cameraCount: -1 }, { cameraCount: 1.2 },
    { cameraCount: "192" }, { sourceDate: undefined }, { sourceDate: "2025-02-31" },
    { retrievedAt: undefined }, { positionSourceUrl: undefined }, { sourceUrl: undefined },
    { verified: true }, { opticsVerified: true }, { heading: 180 },
    { publicViewUrl: "https://example.com/view" }, { sourceKind: "user-report", reportedCount: 192 },
  ]) assert.throws(() => validateCameraDataset([{ ...arena, ...patch }]));
  assert.equal(validateCameraDataset([{ ...arena, cameraCount: null, sourceDate: undefined }])[0].cameraCount, null);
  assert.throws(() => validateCameraDataset([{ ...seeds[0], cameraCount: 192 }]), /documented site/);
});

test("OSM provenance preserves coordinates and does not infer ownership from surveillance=public", () => {
  const snapshot = read("../data/sources/opole-osm-reviewed-2026-09-03.json");
  const osm = additions.filter((camera) => camera.sourceKind === "open-map");
  assert.equal(osm.length, 8);
  for (const camera of osm) {
    const element = snapshot.elements.find((entry: { id: number }) => "osm:" + entry.id === camera.id);
    assert.deepEqual([camera.lat, camera.lng], [element.lat, element.lon]);
    assert.equal(camera.category, "other");
    assert.equal(camera.verified, false);
    assert.equal(camera.publicViewUrl, undefined);
  }
  for (const id of [11150691676, 11150778145, 11150778146]) assert.ok(!catalog.some((camera) => camera.id === "osm:" + id));
  assert.throws(() => validateCameraDataset([{ ...osm[0], verified: true }]));
});

test("private objects, user reports and operator search retain their distinct provenance", () => {
  const privateRecords = filterCameras(catalog, { query: "", category: "private", verifiedOnly: false });
  assert.equal(privateRecords.length, 5);
  assert.equal(countCameras(privateRecords), 4);
  assert.equal(countDocumentedSites(privateRecords), 4);
  assert.equal(filterCameras(catalog, { query: "Zaklad Komunalny", category: "all", verifiedOnly: false }).length, 7);
  assert.equal(filterCameras(additions, { query: "", category: "all", verifiedOnly: true }).length, 0);
});
