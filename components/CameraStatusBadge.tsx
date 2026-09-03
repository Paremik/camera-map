"use client";

import type { CameraAvailability } from "@/lib/map-features";
import { useI18n } from "@/lib/i18n";

export default function CameraStatusBadge({ value, compact = false }: { value?: CameraAvailability; compact?: boolean }) {
  const { locale, t } = useI18n();
  const status = value?.status ?? "unknown";
  const label = t(status === "working" ? "statusWorking" : status === "unavailable" ? "statusUnavailable" : "statusUnknown");
  const time = value?.sourceTime ?? value?.checkedAt;
  return <span className={"availability " + status + (compact ? " compact" : "")} title={time ? t(value?.sourceTime ? "lastImage" : "lastCheck") + ": " + new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(time)) : undefined}><i />{label}</span>;
}
