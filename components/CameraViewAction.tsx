import type { Camera } from "@/lib/camera";
import Icon from "./Icon";

export default function CameraViewAction({ camera, onSnapshot, compact = false }: {
  camera: Camera; onSnapshot: (camera: Camera) => void; compact?: boolean;
}) {
  const className = compact ? "row-view" : "view-button";
  if (camera.snapshotSourceUrl) {
    const label = compact ? "Снимок ITS" : "Открыть снимок камеры";
    return <button className={className} aria-label={compact ? label + ": " + camera.name : label} onClick={() => onSnapshot(camera)}><Icon name="camera" />{label}</button>;
  }
  if (!camera.publicViewUrl) return null;
  const label = camera.publicViewUrl === "https://its.mzd.opole.pl/mapa" ? "Открыть карту ITS" : "Смотреть камеру";
  return <a className={className} href={camera.publicViewUrl} target="_blank" rel="noopener noreferrer" aria-label={compact ? label + ": " + camera.name : label}><Icon name="play" />{label}<span aria-hidden="true">↗</span></a>;
}
