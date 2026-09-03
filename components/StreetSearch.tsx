"use client";

import { useState, type FormEvent } from "react";
import type { StreetHighlight } from "@/lib/street-search";
import Icon from "./Icon";

export default function StreetSearch({ street, onFound, onClear }: { street: StreetHighlight | null; onFound: (street: StreetHighlight) => void; onClear: () => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "error"; message?: string }>({ type: "idle" });
  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 2) { setStatus({ type: "error", message: "Введите название улицы." }); return; }
    setStatus({ type: "loading" });
    try {
      const response = await fetch("/api/streets?q=" + encodeURIComponent(value), { credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Улица не найдена.");
      onFound(data as StreetHighlight);
      setStatus({ type: "idle" });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Поиск улиц сейчас недоступен." });
    }
  }
  return <div className="street-search-block">
    <form className="street-search" role="search" aria-label="Поиск улицы на карте" onSubmit={submit}>
      <label htmlFor="street-search">Найти улицу на карте</label>
      <div className="street-search-row"><span className="search-field"><Icon name="pin" /><input id="street-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Например: Armii Krajowej" autoComplete="off" /></span><button type="submit" disabled={status.type === "loading"} aria-label="Найти улицу"><Icon name="search" /></button></div>
    </form>
    {status.type === "loading" && <p className="street-status" role="status">Ищем улицу…</p>}
    {status.type === "error" && <p className="street-status error" role="alert">{status.message}</p>}
    {street && <div className="street-result"><span><i />{street.name}</span><button type="button" onClick={onClear}>Убрать</button></div>}
    <a className="street-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Поиск улиц: © OpenStreetMap contributors</a>
  </div>;
}
