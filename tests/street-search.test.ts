import assert from "node:assert/strict";
import test from "node:test";
import { parseStreetResponse, streetSearchUrl } from "../lib/street-search.ts";

const feature = (name: string, id: number, coordinates: number[][], overrides = {}) => ({
  type: "Feature", properties: { category: "highway", addresstype: "road", name, osm_type: "way", osm_id: id },
  geometry: { type: "LineString", coordinates }, ...overrides,
});

test("street results combine all same-named road sections and calculate bounds from geometry", () => {
  const result = parseStreetResponse({ type: "FeatureCollection", features: [
    feature("Armii Krajowej", 1, [[17.93, 50.66], [17.94, 50.67]]),
    feature("Armii Krajowej", 2, [[17.94, 50.67], [17.95, 50.68]]),
    feature("Inna ulica", 3, [[17.9, 50.65], [17.91, 50.65]]),
  ] });
  assert.equal(result?.name, "Armii Krajowej");
  assert.equal(result?.geometry.features.length, 2);
  assert.deepEqual(result?.bbox, [17.93, 50.66, 17.95, 50.68]);
  assert.deepEqual(result?.geometry.features.map(item => item.properties.id), ["way1", "way2"]);
});

test("non-road, point and out-of-Opole results never become a street highlight", () => {
  for (const item of [
    feature("Building", 1, [[17.93, 50.66], [17.94, 50.67]], { properties: { category: "building", addresstype: "building", name: "Building" } }),
    { ...feature("Road", 1, [[17.93, 50.66], [17.94, 50.67]]), geometry: { type: "Point", coordinates: [17.93, 50.66] } },
    feature("Warsaw road", 1, [[21.0, 52.2], [21.1, 52.2]]),
  ]) assert.equal(parseStreetResponse({ type: "FeatureCollection", features: [item] }), null);
  assert.throws(() => parseStreetResponse({ type: "FeatureCollection", features: Array.from({ length: 51 }, (_, id) => feature("Road", id, [[17.9, 50.6], [17.91, 50.61]])) }), /Unexpected/);
});

test("search URL is restricted to Opole and requests complete line geometry without autocomplete", () => {
  const url = streetSearchUrl("https://nominatim.openstreetmap.org/search", "1 Maja");
  assert.equal(url.searchParams.get("street"), "1 Maja");
  assert.equal(url.searchParams.get("city"), "Opole");
  assert.equal(url.searchParams.get("bounded"), "1");
  assert.equal(url.searchParams.get("polygon_geojson"), "1");
  assert.equal(url.searchParams.get("dedupe"), "0");
  assert.equal(url.searchParams.get("limit"), "50");
  assert.throws(() => streetSearchUrl("http://nominatim.example/search", "Road"), /HTTPS/);
  assert.throws(() => streetSearchUrl("https://user:password@example.com/search", "Road"), /HTTPS/);
});
