import assert from "node:assert/strict";
import test from "node:test";
import { droneZonesGeoJson, epopAtz } from "../lib/drone-zones.ts";

test("EPOP ATZ keeps the published AIP centre, radius and conditional activity", () => {
  assert.deepEqual(epopAtz.center, [17.7816667, 50.6333333]);
  assert.equal(epopAtz.radiusMeters, 10_000);
  assert.equal(epopAtz.activity, "AUP");
  const feature = droneZonesGeoJson().features[0];
  assert.equal(feature.properties.name, "EPOP ATZ");
  assert.equal(feature.properties.lowerLimit, "GND");
  assert.deepEqual(feature.geometry.coordinates[0][0], feature.geometry.coordinates[0].at(-1));
  assert.equal(feature.geometry.coordinates[0].length, 91);
});
