import type { Camera } from "./camera.ts";

export const incidentKinds = ["crash", "property-damage", "road-hazard", "other"] as const;
export type IncidentKind = typeof incidentKinds[number];
export type IncidentPoint = { lng: number; lat: number; kind?: IncidentKind; occurredAt?: string | null };

export function incidentKindLabel(kind: IncidentKind) {
  return kind === "crash" ? "ДТП" : kind === "property-damage" ? "Повреждение имущества" : kind === "road-hazard" ? "Опасность на дороге" : "Другое происшествие";
}

export type InsuranceCandidate = {
  camera: Camera;
  distanceMeters: number;
  priority: "high" | "medium" | "low";
  reason: string;
};

const earthRadius = 6_371_000;
const radians = (value: number) => value * Math.PI / 180;

export function incidentDistanceMeters(point: IncidentPoint, camera: Camera) {
  const latitude = radians((point.lat + camera.lat) / 2);
  return Math.hypot(radians(camera.lng - point.lng) * earthRadius * Math.cos(latitude), radians(camera.lat - point.lat) * earthRadius);
}

export function insuranceCandidates(cameras: readonly Camera[], point: IncidentPoint | null, radiusMeters: number): InsuranceCandidate[] {
  if (!point) return [];
  return cameras.map(camera => {
    const distanceMeters = incidentDistanceMeters(point, camera);
    if (camera.recordKind === "site") return { camera, distanceMeters, priority: "low" as const, reason: "Объект с видеонаблюдением: количество и положение камер могут быть неизвестны." };
    if (camera.publicViewUrl || camera.snapshotSourceUrl) return { camera, distanceMeters, priority: "high" as const, reason: "Есть публичный источник просмотра; историческую запись нужно запросить у владельца." };
    if (camera.heading !== null && camera.fov !== null && camera.rangeMeters !== null) return { camera, distanceMeters, priority: "medium" as const, reason: "Есть ориентировочные параметры оптики, но они не доказывают обзор или наличие записи." };
    return { camera, distanceMeters, priority: "medium" as const, reason: "Камера находится рядом, но направление и историческая доступность не опубликованы." };
  }).filter(candidate => candidate.distanceMeters <= radiusMeters).sort((a, b) => a.distanceMeters - b.distanceMeters || a.camera.name.localeCompare(b.camera.name));
}

export function preservationRequest(candidate: InsuranceCandidate, incidentAt: string, caseReference: string) {
  const camera = candidate.camera;
  return [
    "Тема: просьба сохранить запись видеонаблюдения",
    "",
    `Прошу проверить возможность сохранения записи с камеры/объекта «${camera.name}» (${camera.street}) в связи с происшествием ${incidentAt || "(укажите дату и время)"}.`,
    caseReference ? `Номер дела: ${caseReference}.` : "",
    `Ориентир происшествия: ${camera.lat.toFixed(5)}, ${camera.lng.toFixed(5)}; камера отмечена примерно в ${Math.round(candidate.distanceMeters)} м от указанной точки.`,
    "",
    "Прошу сообщить порядок подачи официального запроса и, если это допустимо, принять меры к сохранению записи. Карта не подтверждает, что камера видела происшествие или что запись существует.",
  ].filter(Boolean).join("\n");
}

export function insuranceCaseExport(point: IncidentPoint, incidentAt: string, caseReference: string, radiusMeters: number, candidates: readonly InsuranceCandidate[]) {
  return {
    generatedAt: new Date().toISOString(),
    incident: { latitude: point.lat, longitude: point.lng, kind: point.kind ?? "crash", occurredAt: incidentAt || point.occurredAt || null, caseReference: caseReference || null, radiusMeters },
    disclaimer: "Справочный поиск по опубликованному каталогу. Не подтверждает обзор, работоспособность, хранение или выдачу видеозаписи.",
    candidates: candidates.map(({ camera, distanceMeters, priority, reason }) => ({ id: camera.id, name: camera.name, street: camera.street, latitude: camera.lat, longitude: camera.lng, distanceMeters: Math.round(distanceMeters), priority, reason, recordKind: camera.recordKind ?? "camera", source: camera.sourceLabel, sourceUrl: camera.sourceUrl ?? null, publicViewUrl: camera.publicViewUrl ?? camera.snapshotSourceUrl ?? null, coordinatesVerified: camera.verified, opticsVerified: camera.opticsVerified })),
  };
}
