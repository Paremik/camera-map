"use client";
import { useI18n } from "@/lib/i18n";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useI18n();
  return (
    <main className="fallback-page">
      <h1>{t("catalogueError")}</h1>
      <p>{t("catalogueRetry")}</p>
      <button className="secondary-button" onClick={reset}>
        {t("retry")}
      </button>
    </main>
  );
}
