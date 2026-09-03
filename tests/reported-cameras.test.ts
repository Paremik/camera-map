import assert from "node:assert/strict";
import test from "node:test";
import { cameras } from "../data/cameras.ts";
import { reportedCameras } from "../data/reported-cameras.ts";
import { cameraCategoryLabel, countCameras, filterCameras, groupCameraSites } from "../lib/camera.ts";
import { cameraSector, directionGeoJson } from "../lib/geometry.ts";
import { validateCameraDataset } from "../lib/import-cameras.ts";

test("the entrance report preserves one approximate site and four unverified cameras", () => {
  const reports = validateCameraDataset(reportedCameras);
  assert.equal(reports.length, 1);
  assert.equal(countCameras(reports), 4);
  const report = reports[0];
  assert.equal(report.id, "reported:armii-krajowej-20-entrance");
  assert.equal(report.sourceKind, "user-report");
  assert.equal(cameraCategoryLabel(report), "Предположительно частные");
  assert.equal(report.verified, false);
  assert.equal(report.opticsVerified, false);
  assert.equal(report.sourceUrl, undefined);
  assert.equal(report.publicViewUrl, undefined);
  assert.equal(report.positionSourceUrl, "https://www.openstreetmap.org/way/227002324");
  assert.equal(cameraSector(report), null);
  assert.equal(directionGeoJson(report).features.length, 0);
});

test("site and catalog counts include a reported group without duplicating its location", () => {
  const report = reportedCameras[0];
  const colocated = { ...cameras[0], lat: report.lat, lng: report.lng };
  const sites = groupCameraSites([report, colocated]);
  assert.equal(sites.length, 1);
  assert.equal(sites[0].cameras.length, 2);
  assert.equal(sites[0].cameraCount, 5);
  assert.equal(sites[0].reportedCount, 4);
  assert.equal(countCameras([...cameras, report]), 8);
});

test("private reports are searchable but excluded from verified and ITS filters", () => {
  const catalog = [...cameras, ...reportedCameras];
  assert.deepEqual(filterCameras(catalog, { query: "rodziewiczowny", category: "private", verifiedOnly: false }), reportedCameras);
  assert.equal(filterCameras(catalog, { query: "", category: "private", verifiedOnly: true }).length, 0);
  assert.equal(filterCameras(reportedCameras, { query: "", category: "its", verifiedOnly: false }).length, 0);
});

test("validation rejects misleading report counts, provenance, verification and optics", () => {
  const report = reportedCameras[0];
  for (const reportedCount of [undefined, 0, -1, 1.5, 1001, "4", NaN]) {
    assert.throws(() => validateCameraDataset([{ ...report, reportedCount }]), /reportedCount/);
  }
  for (const patch of [
    { verified: true }, { opticsVerified: true }, { heading: 90 }, { fov: 60 }, { rangeMeters: 100 },
    { sourceUrl: "https://www.openstreetmap.org/way/227002324" },
    { publicViewUrl: "https://example.com/camera" },
    { sourceKind: "unknown" },
  ]) assert.throws(() => validateCameraDataset([{ ...report, ...patch }]));
  assert.throws(() => validateCameraDataset([{ ...cameras[0], reportedCount: 4 }]), /user-report/);
  assert.throws(() => validateCameraDataset([{ ...cameras[0], sourceUrl: undefined }]), /sourceUrl/);
});
