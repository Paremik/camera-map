import assert from "node:assert/strict";
import test from "node:test";
import { droneGeneralAreaGeoJson, droneGeneralLabelGeoJson, droneZonesGeoJson, epopAtz } from "../lib/drone-zones.ts";

test("EPOP ATZ keeps the published AIP centre, radius and conditional activity", () => {
  assert.deepEqual(epopAtz.center, [17.7816667, 50.6333333]);
  assert.equal(epopAtz.radiusMeters, 10_000);
  assert.equal(epopAtz.activity, "AUP");
  const feature = droneZonesGeoJson().features[0];
  assert.equal(feature.properties.name, "EPOP ATZ");
  assert.equal(feature.properties.zoneType, "DRA-R / ATZ");
  assert.equal(feature.properties.access, "conditional");
  assert.equal(feature.properties.lowerLimit, "GND");
  assert.equal(feature.properties.upperLimit, "5500 ft AMSL");
  assert.equal(feature.properties.airspaceClass, "G");
  assert.equal(feature.properties.frequency, "OPOLE RADIO 122.360 MHz");
  assert.equal(feature.properties.sourceDate, "2025-08-07");
  assert.deepEqual(feature.geometry.coordinates[0][0], feature.geometry.coordinates[0].at(-1));
  assert.equal(feature.geometry.coordinates[0].length, 91);
});

test("general reference area is green only outside the known EPOP zone", () => {
  const feature = droneGeneralAreaGeoJson().features[0];
  assert.equal(feature.properties.access, "general");
  assert.equal(feature.geometry.coordinates.length, 2);
  assert.deepEqual(feature.geometry.coordinates[0][0], feature.geometry.coordinates[0].at(-1));
  assert.deepEqual(feature.geometry.coordinates[1][0], feature.geometry.coordinates[1].at(-1));
  assert.equal(feature.geometry.coordinates[1].length, 91);
});

test("general reference label stays in a visible green area outside EPOP", () => {
  const feature = droneGeneralLabelGeoJson("TEST GENERAL AREA").features[0];
  assert.equal(feature.properties.label, "TEST GENERAL AREA");
  assert.deepEqual(feature.geometry.coordinates, [17.94, 50.56]);
});
