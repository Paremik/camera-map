import { destinationPoint, type Position } from "./geometry.ts";

export type DroneZoneAccess = "prohibited" | "conditional" | "information";

export const droneZoneSourceUrl = "https://www.ais.pansa.pl/eAIPVFR/AIRAC%20AMDT%20VFR%2008-25_2025_08_07/documents/PDF/Amdt_VFR_A_2025_08.pdf";
export const droneTowerUrl = "https://www.pansa.pl/dronetower/";
export const airspaceMapUrl = "https://airspace.pansa.pl/map";

export const epopAtz = {
  id: "atz-epop",
  name: "EPOP ATZ",
  center: [17.7816667, 50.6333333] as Position,
  radiusMeters: 10_000,
  lowerLimit: "GND",
  upperLimit: "5500 ft AMSL",
  activity: "AUP",
  zoneType: "DRA-R / ATZ",
  access: "conditional" as DroneZoneAccess,
  airspaceClass: "G",
  frequency: "OPOLE RADIO 122.360 MHz",
  operator: "Aeroklub Opolski",
  sourceDate: "2025-08-07",
};

const referenceBounds: Position[] = [
  [17.55, 50.45],
  [18.20, 50.45],
  [18.20, 50.90],
  [17.55, 50.90],
  [17.55, 50.45],
];

function epopRing() {
  const ring: Position[] = [];
  for (let bearing = 0; bearing < 360; bearing += 4) {
    ring.push(destinationPoint(epopAtz.center[1], epopAtz.center[0], bearing, epopAtz.radiusMeters));
  }
  ring.push(ring[0]);
  return ring;
}

export function droneZonesGeoJson() {
  const ring = epopRing();
  return {
    type: "FeatureCollection" as const,
    features: [{
      type: "Feature" as const,
      properties: {
        id: epopAtz.id,
        name: epopAtz.name,
        activity: epopAtz.activity,
        zoneType: epopAtz.zoneType,
        access: epopAtz.access,
        lowerLimit: epopAtz.lowerLimit,
        upperLimit: epopAtz.upperLimit,
        airspaceClass: epopAtz.airspaceClass,
        frequency: epopAtz.frequency,
        operator: epopAtz.operator,
        sourceDate: epopAtz.sourceDate,
        notice: "Conditional zone — verify current activation in DroneTower",
      },
      geometry: { type: "Polygon" as const, coordinates: [ring] },
    }],
  };
}

export function droneGeneralAreaGeoJson() {
  return {
    type: "FeatureCollection" as const,
    features: [{
      type: "Feature" as const,
      properties: {
        id: "reference-general-area",
        access: "general",
        notice: "No restriction found in the incomplete reference layer — check DroneTower before takeoff; this is not flight authorisation",
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [referenceBounds, epopRing()],
      },
    }],
  };
}

export function droneGeneralLabelGeoJson(label: string) {
  return {
    type: "FeatureCollection" as const,
    features: [{
      type: "Feature" as const,
      properties: { id: "reference-general-label", access: "general", label },
      geometry: { type: "Point" as const, coordinates: [17.94, 50.56] as Position },
    }],
  };
}
