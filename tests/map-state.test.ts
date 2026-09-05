import assert from "node:assert/strict";
import test from "node:test";
import { mapShareLink, readMapShareState } from "../lib/map-state.ts";

test("full map links preserve a safe, reproducible view", () => {
  const link = mapShareLink("https://example.com/app?old=1", { cameraId: "its:1", layers: new Set(["its", "reported"]), is3D: true, theme: "dark", coverage: true, street: "Armii Krajowej", view: { lng: 17.92, lat: 50.67, zoom: 15.5, bearing: -12, pitch: 55 } });
  const state = readMapShareState(new URL(link).search);
  assert.deepEqual([...state.layers!], ["its", "reported"]);
  assert.equal(state.street, "Armii Krajowej"); assert.equal(state.view?.zoom, 15.5); assert.equal(state.is3D, true);
});

test("invalid shared map values are ignored", () => {
  const state = readMapShareState("?layers=evil&view=1,2,99,0,0&street=");
  assert.equal(state.layers, null); assert.equal(state.view, null); assert.equal(state.street, null);
});
