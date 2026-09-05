"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { StreetHighlight } from "@/lib/street-search";
import Icon from "./Icon";
import { useI18n } from "@/lib/i18n";

export default function StreetSearch({ street, onFound, onClear }: { street: StreetHighlight | null; onFound: (street: StreetHighlight) => void; onClear: () => void }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "error"; message?: string }>({ type: "idle" });
  useEffect(() => { if (street) setQuery(street.name); }, [street]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 2) { setStatus({ type: "error", message: t("enterStreet") }); return; }
    setStatus({ type: "loading" });
    try {
      const response = await fetch("/api/streets?q=" + encodeURIComponent(value), { credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 404 ? t("streetMissing") : t("streetError"));
      onFound(data as StreetHighlight);
      setStatus({ type: "idle" });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : t("streetError") });
    }
  }
  return <div className="street-search-block">
    <form className="street-search" role="search" aria-label={t("findStreet")} onSubmit={submit}>
      <label htmlFor="street-search">{t("findStreet")}</label>
      <div className="street-search-row"><span className="search-field"><Icon name="pin" /><input id="street-search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("streetExample")} autoComplete="off" /></span><button type="submit" disabled={status.type === "loading"} aria-label={t("searchStreet")}><Icon name="search" /></button></div>
    </form>
    {status.type === "loading" && <p className="street-status" role="status">{t("searchingStreet")}</p>}
    {status.type === "error" && <p className="street-status error" role="alert">{status.message}</p>}
    {street && <div className="street-result"><span><i />{street.name}</span><button type="button" onClick={onClear}>{t("remove")}</button></div>}
    <a className="street-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">{t("streetSource")}</a>
  </div>;
}
