"use client";
import { useI18n } from "@/lib/i18n";
export default function Loading() {
  const { t } = useI18n();
  return (
    <main className="fallback-page" role="status">
      <h1>Opole / cameras</h1>
      <p>{t("catalogueLoading")}</p>
    </main>
  );
}
