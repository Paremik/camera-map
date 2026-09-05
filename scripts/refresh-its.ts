import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { importItsGeoJson } from "../lib/import-cameras.ts";

const sourceUrl = "https://its.mzd.opole.pl/api/cameras";
const snapshotUrl = new URL("../data/sources/its-opole-latest.json", import.meta.url);
const catalogUrl = new URL("../data/its-cameras.json", import.meta.url);

async function main() {
  const response = await fetch(sourceUrl, { headers: { Accept: "application/geo+json", "User-Agent": "OpoleCameraMap/0.1 (+https://github.com/Paremik/camera-map)" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error("ITS returned HTTP " + response.status);
  const collection: unknown = await response.json();
  const raw = JSON.stringify(collection);
  const responseSha256 = createHash("sha256").update(raw).digest("hex");
  try {
    const previous = JSON.parse(await readFile(snapshotUrl, "utf8"));
    if (previous.responseSha256 === responseSha256) { console.log("ITS catalogue is unchanged."); return; }
  } catch { /* A missing or invalid local snapshot is replaced after validation. */ }
  const retrievedAt = new Date().toISOString().slice(0, 10);
  const snapshot = { schemaVersion: 1, format: "its-geojson-v1", sourceUrl, retrievedAt, responseSha256, collection };
  const cameras = importItsGeoJson(snapshot);
  await writeFile(snapshotUrl, JSON.stringify(snapshot, null, 2) + "\n");
  await writeFile(catalogUrl, JSON.stringify(cameras, null, 2) + "\n");
  console.log(`Updated ${cameras.length} ITS cameras from the official public catalogue.`);
}

main().catch(error => {
  const cause = error instanceof Error && error.cause instanceof Error ? `: ${error.cause.message}` : "";
  console.error((error instanceof Error ? error.message : error) + cause);
  process.exitCode = 1;
});
