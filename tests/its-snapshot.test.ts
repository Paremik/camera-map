import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { importItsGeoJson, validateCameraDataset } from "../lib/import-cameras.ts";
import { cameras } from "../data/cameras.ts";

test("shipped ITS dataset exactly matches the archived public source through the adapter", () => {
  const snapshot = JSON.parse(readFileSync(new URL("../data/sources/its-opole-2026-09-03.json", import.meta.url), "utf8"));
  const shipped = JSON.parse(readFileSync(new URL("../data/its-cameras.json", import.meta.url), "utf8"));
  assert.ok(shipped.length > 0);
  assert.deepEqual(shipped, importItsGeoJson(snapshot));
  assert.equal(validateCameraDataset([...cameras, ...shipped]).length, cameras.length + snapshot.collection.features.length);
});
