import type { Camera } from "@/lib/camera";
import Icon from "./Icon";
import { useI18n } from "@/lib/i18n";

export default function CameraViewAction({ camera, onSnapshot, compact = false }: {
  camera: Camera; onSnapshot: (camera: Camera) => void; compact?: boolean;
}) {
  const { t } = useI18n();
  const className = compact ? "row-view" : "view-button";
  if (camera.snapshotSourceUrl) {
    const label = compact ? t("itsSnapshot") : t("openSnapshot");
    return <button className={className} aria-label={compact ? label + ": " + camera.name : label} onClick={() => onSnapshot(camera)}><Icon name="camera" />{label}</button>;
  }
  if (!camera.publicViewUrl) return null;
  const label = camera.publicViewUrl === "https://its.mzd.opole.pl/mapa" ? t("openIts") : t("watchCamera");
  return <a className={className} href={camera.publicViewUrl} target="_blank" rel="noopener noreferrer" aria-label={compact ? label + ": " + camera.name : label}><Icon name="play" />{label}<span aria-hidden="true">↗</span></a>;
}
