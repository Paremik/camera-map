import type { Camera } from "../lib/camera.ts";

// The user approved adding this observation on 2026-09-03.
// The point is the midpoint of OSM building passage 227002324, not four camera mounts.
export const reportedCameras: Camera[] = [{
  id: "reported:armii-krajowej-20-entrance",
  name: "Въезд у Armii Krajowej 20",
  street: "Armii Krajowej 20 · проезд Marii Rodziewiczówny",
  lat: 50.66129,
  lng: 17.93862,
  category: "private",
  sourceKind: "user-report",
  reportedCount: 4,
  heading: null,
  fov: null,
  rangeMeters: null,
  verified: false,
  opticsVerified: false,
  sourceLabel: "Сообщение пользователя · 03.09.2026",
  positionSourceUrl: "https://www.openstreetmap.org/way/227002324",
  positionSourceLabel: "Ориентир: проезд под зданием · OpenStreetMap",
  note: "Пользователь сообщил о четырёх камерах над въездом и предположил, что они частные. Одна отметка обозначает весь въезд; отдельные места крепления, направления и оператор не подтверждены. OpenStreetMap подтверждает положение проезда, но не наличие камер.",
}];
