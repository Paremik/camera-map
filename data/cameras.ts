import type { Camera } from "../lib/camera.ts";
export type { Camera } from "../lib/camera.ts";

const sourceUrl = "https://www.opole.pl/dla-turysty/opole-okiem-kamery";
const shared = {
  // Approximate point inside the public OSM Ratusz outline (way 207031541), not a surveyed camera mount.
  street: "Rynek, Ratusz", lat: 50.66855, lng: 17.92240, category: "public" as const,
  verified: false, opticsVerified: false,
  sourceLabel: "Miasto Opole · Opole okiem kamery", sourceUrl, publicViewUrl: sourceUrl,
  positionSourceUrl: "https://www.openstreetmap.org/way/207031541",
  note: "Город публикует четыре вида с ратуши. Точка обозначает здание по OpenStreetMap, а не точное крепление камер. Направление, угол и дальность приблизительные.",
};
export const cameras: Camera[] = [
  { ...shared, id: "ratusz-aleja-gwiazd", name: "Ratusz — Aleja Gwiazd", heading: 190, fov: 55, rangeMeters: 170 },
  { ...shared, id: "ratusz-zachod", name: "Ratusz — Wieża Piastowska / Amfiteatr", heading: 270, fov: 55, rangeMeters: 320 },
  { ...shared, id: "ratusz-katedra", name: "Ratusz — Katedra", heading: 320, fov: 50, rangeMeters: 330 },
  { ...shared, id: "ratusz-wschod", name: "Ratusz — ul. Św. Wojciecha / Na Górce", heading: 90, fov: 55, rangeMeters: 350 },
];
