import assert from "node:assert/strict";
import test from "node:test";
import { cameraLink, isLocalLink, readCameraLink, readFavorites, writeFavorites } from "../lib/camera-preferences.ts";

const known = new Set(["ratusz-katedra", "its:fixture-1"]);

test("favorite persistence retains stable IDs and removes duplicates or removed cameras", () => {
  assert.deepEqual(readFavorites(writeFavorites(["its:fixture-1", "ratusz-katedra", "its:fixture-1", "removed"]), known), ["its:fixture-1", "ratusz-katedra"]);
});

test("missing, malformed and incompatible local storage cannot break the catalog", () => {
  for (const raw of [null, "{broken", "null", "[]", '{"version":2,"ids":["ratusz-katedra"]}', '{"version":1,"ids":{}}', "x".repeat(2_000_001)]) {
    assert.deepEqual(readFavorites(raw, known), []);
  }
  assert.deepEqual(readFavorites('{"version":1,"ids":[null,7,{},"ratusz-katedra"]}', known), ["ratusz-katedra"]);
});

test("direct links resolve exact known IDs, including namespaced imported IDs", () => {
  assert.deepEqual(readCameraLink("?camera=its%3Afixture-1", known), { id: "its:fixture-1", invalid: false });
  assert.deepEqual(readCameraLink("?lang=pl", known), { id: null, invalid: false });
  for (const search of ["?camera=missing", "?camera=", "?camera=%ZZ", "?camera=ratusz-katedra&camera=its%3Afixture-1"]) {
    assert.deepEqual(readCameraLink(search, known), { id: null, invalid: true });
  }
});

test("copy links keep origin and deployment path while dropping unrelated URL state", () => {
  const url = cameraLink("https://example.com/cameras/?lang=pl&camera=old#list", "its:fixture-1", true);
  assert.equal(url, "https://example.com/cameras/?camera=its%3Afixture-1");
  assert.equal(readCameraLink(new URL(url).search, known).id, "its:fixture-1");
  assert.equal(cameraLink("https://example.com/cameras/?lang=pl&camera=old#list", null), "https://example.com/cameras/?lang=pl#list");
});

test("copy feedback identifies local links without labelling a public domain local", () => {
  for (const url of ["http://127.0.0.1:3000", "http://localhost:3000", "http://[::1]:3000", "http://app.localhost:3000"]) assert.equal(isLocalLink(url), true);
  assert.equal(isLocalLink("https://example.com"), false);
});
