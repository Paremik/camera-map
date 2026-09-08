import assert from "node:assert/strict";
import test from "node:test";
import {
  camerasInArea,
  camerasNearRoute,
  camerasCsv,
  camerasGeoJson,
  distanceToSegmentMeters,
} from "../lib/map-analysis.ts";
import type { Camera } from "../lib/camera.ts";

const camera = (id: string, lng: number, lat: number): Camera => ({
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
});
const list = [
  camera("inside", 17.92, 50.67),
  camera("edge", 17.93, 50.68),
  camera("outside", 18.0, 50.75),
];

test("area analysis includes points inside and on a rectangle boundary", () => {
  assert.deepEqual(
    camerasInArea(list, [
      [17.91, 50.66],
      [17.93, 50.68],
    ]).map((item) => item.id),
    ["inside", "edge"],
  );
});

test("route analysis uses a bounded metric corridor", () => {
  assert.ok(
    distanceToSegmentMeters([17.92, 50.6705], [17.91, 50.67], [17.93, 50.67]) <
      100,
  );
  assert.deepEqual(
    camerasNearRoute(
      list,
      [
        [17.91, 50.67],
        [17.93, 50.67],
      ],
      100,
    ).map((item) => item.id),
    ["inside"],
  );
});

test("analysis exports valid CSV and GeoJSON without losing provenance", () => {
  assert.match(camerasCsv(list.slice(0, 1)), /inside,inside,Street/);
  const geojson = camerasGeoJson(list.slice(0, 1));
  assert.equal(geojson.features[0].properties.source, "Source");
  assert.deepEqual(geojson.features[0].geometry.coordinates, [17.92, 50.67]);
});
