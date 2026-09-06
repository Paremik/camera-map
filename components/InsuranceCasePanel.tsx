"use client";

import { useMemo, useState } from "react";
import type { Camera } from "@/lib/camera";
import { insuranceCandidates, insuranceCaseExport, preservationRequest, type IncidentPoint, type InsuranceCandidate } from "@/lib/insurance-case";
import Icon from "./Icon";

type Props = {
  cameras: Camera[];
  point: IncidentPoint | null;
  picking: boolean;
  onPick: () => void;
  onClear: () => void;
  onSelect: (camera: Camera) => void;
};

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { window.prompt("Скопируйте текст запроса", text); return false; }
}

function priorityLabel(priority: InsuranceCandidate["priority"]) {
  return priority === "high" ? "Сначала проверить" : priority === "medium" ? "Проверить" : "Объект-ориентир";
}

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!); }

function printCase(point: IncidentPoint, incidentAt: string, caseReference: string, radiusMeters: number, candidates: readonly InsuranceCandidate[]) {
  const report = insuranceCaseExport(point, incidentAt, caseReference, radiusMeters, candidates);
  const rows = report.candidates.map(candidate => `<tr><td>${escapeHtml(candidate.name)}</td><td>${escapeHtml(candidate.street)}</td><td>${candidate.distanceMeters} м</td><td>${escapeHtml(candidate.priority)}</td><td>${escapeHtml(candidate.source)}</td></tr>`).join("");
  const page = window.open("", "_blank", "noopener,noreferrer");
  if (!page) { window.alert("Браузер заблокировал окно печати. Разрешите всплывающие окна для этой карты и повторите попытку."); return; }
  page.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Страховой случай — Opole Camera Map</title><style>body{font:14px Arial,sans-serif;color:#172025;margin:34px;line-height:1.45}h1{margin:0 0 8px}p{margin:6px 0}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid #bbc4c6;padding:8px;text-align:left;vertical-align:top}th{background:#edf2ee}.note{margin-top:18px;padding:12px;background:#fff5df;border-left:4px solid #c8892d}</style></head><body><h1>Поиск источников для страхового случая</h1><p><b>Сформировано:</b> ${escapeHtml(report.generatedAt)}</p><p><b>Номер дела:</b> ${escapeHtml(caseReference || "не указан")}</p><p><b>Время происшествия:</b> ${escapeHtml(incidentAt || "не указано")}</p><p><b>Точка:</b> ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} · радиус ${radiusMeters} м</p><table><thead><tr><th>Запись</th><th>Место</th><th>Расстояние</th><th>Приоритет</th><th>Источник</th></tr></thead><tbody>${rows || "<tr><td colspan='5'>Записей в радиусе не найдено.</td></tr>"}</tbody></table><p class="note">${escapeHtml(report.disclaimer)} Свяжитесь с владельцем по официальному источнику как можно быстрее; приложение не отправляет запросы и не хранит данные дела.</p></body></html>`);
  page.document.close(); page.focus(); page.print();
}

export default function InsuranceCasePanel({ cameras, point, picking, onPick, onClear, onSelect }: Props) {
  const [radiusMeters, setRadiusMeters] = useState(250);
  const [incidentAt, setIncidentAt] = useState("");
  const [caseReference, setCaseReference] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const candidates = useMemo(() => insuranceCandidates(cameras, point, radiusMeters), [cameras, point, radiusMeters]);
  const usable = candidates.filter(candidate => candidate.camera.recordKind !== "site");

  return <details className="insurance-panel">
    <summary><Icon name="shield" /> Страховой случай <span>поиск записи</span></summary>
    <div className="insurance-body">
      <p className="insurance-intro">Поиск только по опубликованному каталогу. Он не даёт доступ к камерам и не подтверждает, что запись существует.</p>
      <div className="insurance-form">
        <label>Номер дела <input value={caseReference} maxLength={80} placeholder="Например: CLM-2026-014" onChange={event => setCaseReference(event.target.value)} /></label>
        <label>Дата и время происшествия <input type="datetime-local" value={incidentAt} onChange={event => setIncidentAt(event.target.value)} /></label>
        <label>Радиус поиска <select value={radiusMeters} onChange={event => setRadiusMeters(Number(event.target.value))}><option value={100}>100 м</option><option value={250}>250 м</option><option value={500}>500 м</option><option value={1000}>1 км</option></select></label>
      </div>
      <div className="insurance-actions"><button className={picking ? "active" : ""} aria-pressed={picking} onClick={onPick}><Icon name="pin" /> {picking ? "Нажмите точку на карте" : "Отметить место"}</button>{point && <button onClick={onClear}>Очистить случай</button>}</div>
      {!point ? <p className="insurance-hint">Выберите точку ДТП или повреждения на карте. Личные данные и записи не сохраняются.</p> : <>
        <div className="insurance-case" role="status"><strong>{candidates.length} записей в радиусе {radiusMeters} м</strong><span>Координаты: {point.lat.toFixed(5)}, {point.lng.toFixed(5)}</span><span>{usable.length} камер · {candidates.length - usable.length} объектов-ориентиров</span></div>
        <div className="insurance-export"><button onClick={() => download("opole-insurance-case.json", JSON.stringify(insuranceCaseExport(point, incidentAt, caseReference, radiusMeters, candidates), null, 2))}>Экспорт отчёта JSON</button><button onClick={() => printCase(point, incidentAt, caseReference, radiusMeters, candidates)}>Печать / PDF</button></div>
        <p className="insurance-warning">Время внесено для вашего запроса. В каталоге нет истории работы камер и сроков хранения записей — сразу свяжитесь с владельцем по официальному источнику.</p>
        <div className="insurance-candidates" aria-label="Камеры рядом с происшествием">
          {candidates.length === 0 && <p className="insurance-hint">В этом радиусе опубликованных записей не найдено. Увеличьте радиус или уточните точку.</p>}
          {candidates.map(candidate => <article key={candidate.camera.id} className={'insurance-candidate ' + candidate.priority}>
            <div><button className="insurance-camera" onClick={() => onSelect(candidate.camera)}><strong>{candidate.camera.name}</strong><span>{candidate.camera.street} · {Math.round(candidate.distanceMeters)} м</span></button><span className="insurance-priority">{priorityLabel(candidate.priority)}</span></div>
            <p>{candidate.reason}</p>
            <div className="insurance-row-actions"><button onClick={async () => { if (await copy(preservationRequest(candidate, incidentAt, caseReference))) { setCopiedId(candidate.camera.id); setTimeout(() => setCopiedId(null), 1800); } }}>{copiedId === candidate.camera.id ? "Запрос скопирован" : "Скопировать запрос"}</button>{candidate.camera.sourceUrl && <a href={candidate.camera.sourceUrl} target="_blank" rel="noopener noreferrer">Источник ↗</a>}</div>
          </article>)}
        </div>
      </>}
    </div>
  </details>;
}
