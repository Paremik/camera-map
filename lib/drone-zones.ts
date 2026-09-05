import { destinationPoint, type Position } from "./geometry.ts";

export const droneZoneSourceUrl = "https://www.ais.pansa.pl/eAIPVFR/AIRAC%20AMDT%20VFR%2005-25_2025_05_15/documents/PDF/Amdt_VFR_A_2025_05.pdf";
export const droneTowerUrl = "https://www.pansa.pl/dronetower/";

export const epopAtz = {
  id: "atz-epop",
  name: "EPOP ATZ",
  center: [17.7816667, 50.6333333] as Position,
  radiusMeters: 10_000,
  lowerLimit: "GND",
  upperLimit: "5500 ft AMSL",
  activity: "AUP",
  sourceDate: "2025-05-15",
};

export function droneZonesGeoJson() {
  const ring: Position[] = [];
  for (let bearing = 0; bearing < 360; bearing += 4) {
    ring.push(destinationPoint(epopAtz.center[1], epopAtz.center[0], bearing, epopAtz.radiusMeters));
  }
  ring.push(ring[0]);
  return {
    type: "FeatureCollection" as const,
    features: [{
      type: "Feature" as const,
      properties: {
        id: epopAtz.id,
        name: epopAtz.name,
        activity: epopAtz.activity,
        lowerLimit: epopAtz.lowerLimit,
        upperLimit: epopAtz.upperLimit,
        notice: "Conditional zone — verify current activation in DroneTower",
      },
      geometry: { type: "Polygon" as const, coordinates: [ring] },
    }],
  };
}
