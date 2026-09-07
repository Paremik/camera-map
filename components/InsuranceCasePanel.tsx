"use client";

import { useMemo, useState } from "react";
import type { Camera } from "@/lib/camera";
import {
  incidentKindLabel,
  incidentKinds,
  insuranceCandidates,
  insuranceCaseExport,
  type IncidentKind,
  type IncidentPoint,
  type InsuranceCandidate,
} from "@/lib/insurance-case";
import { useI18n } from "@/lib/i18n";
import Icon from "./Icon";

type Props = {
  cameras: Camera[];
  point: IncidentPoint | null;
  picking: boolean;
  onPick: () => void;
  onClear: () => void;
  onSelect: (camera: Camera) => void;
  incidentKind: IncidentKind;
  incidentAt: string;
  onIncidentKind: (kind: IncidentKind) => void;
  onIncidentAt: (value: string) => void;
  onShareIncident: () => Promise<boolean>;
};

function download(name: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function copy(text: string, promptLabel: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt(promptLabel, text);
    return false;
  }
}

function priorityLabel(priority: InsuranceCandidate["priority"]) {
  return priority === "high"
    ? "Сначала проверить"
    : priority === "medium"
      ? "Проверить"
      : "Объект-ориентир";
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}

function printCase(
  point: IncidentPoint,
  incidentAt: string,
  caseReference: string,
  radiusMeters: number,
  candidates: readonly InsuranceCandidate[],
  t: (key: string) => string,
  locale: string,
) {
  const report = insuranceCaseExport(
    point,
    incidentAt,
    caseReference,
    radiusMeters,
    candidates,
    t,
  );
  const rows = candidates
    .map(
      (candidate) =>
        "<tr><td>" +
        escapeHtml(candidate.camera.name) +
        "</td><td>" +
        escapeHtml(candidate.camera.street) +
        "</td><td>" +
        Math.round(candidate.distanceMeters) +
        " " +
        escapeHtml(t("detail16")) +
        "</td><td>" +
        escapeHtml(t(priorityLabel(candidate.priority))) +
        "</td><td>" +
        escapeHtml(candidate.camera.sourceLabel) +
        "</td></tr>",
    )
    .join("");
  const frame = document.createElement("iframe");
  frame.title = t("detail21");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0";
  document.body.append(frame);
  const target = frame.contentWindow;
  if (!target) {
    frame.remove();
    window.alert(t("reportPrintFailed"));
    return;
  }
  const headings = [
    t("records"),
    t("reportPlace"),
    t("reportDistance"),
    t("reportPriority"),
    t("detail32"),
  ]
    .map((value) => "<th>" + escapeHtml(value) + "</th>")
    .join("");
  target.document.open();
  target.document.write(
    '<!doctype html><html lang="' +
      locale +
      '"><head><meta charset="utf-8"><title>' +
      escapeHtml(t("detail0")) +
      "</title><style>body{font:14px Arial;line-height:1.5;padding:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px;text-align:left}</style></head><body><h1>" +
      escapeHtml(t("detail0")) +
      "</h1><p>" +
      escapeHtml(t("reportGenerated")) +
      ": " +
      escapeHtml(report.generatedAt) +
      "</p><p>" +
      escapeHtml(t("detail3")) +
      ": " +
      escapeHtml(caseReference || t("unspecified")) +
      "</p><p>" +
      escapeHtml(t("detail6")) +
      ": " +
      escapeHtml(incidentAt || t("unspecified")) +
      "</p><p>" +
      point.lat.toFixed(5) +
      ", " +
      point.lng.toFixed(5) +
      " · " +
      radiusMeters +
      " " +
      escapeHtml(t("detail16")) +
      "</p><table><thead><tr>" +
      headings +
      "</tr></thead><tbody>" +
      rows +
      "</tbody></table><p>" +
      escapeHtml(t("detail2")) +
      "</p><p>" +
      escapeHtml(t("detail22")) +
      "</p></body></html>",
  );
  target.document.close();
  target.addEventListener("afterprint", () => frame.remove(), { once: true });
  target.focus();
  target.print();
}

export default function InsuranceCasePanel({
  cameras,
  point,
  picking,
  onPick,
  onClear,
  onSelect,
  incidentKind,
  incidentAt,
  onIncidentKind,
  onIncidentAt,
  onShareIncident,
}: Props) {
  const { t, locale } = useI18n();
  const [radiusMeters, setRadiusMeters] = useState(250);
  const [caseReference, setCaseReference] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const candidates = useMemo(
    () => insuranceCandidates(cameras, point, radiusMeters),
    [cameras, point, radiusMeters],
  );
  const usable = candidates.filter(
    (candidate) => candidate.camera.recordKind !== "site",
  );

  return (
    <details className="insurance-panel">
      <summary>
        <Icon name="shield" /> {t("detail0")} <span> {t("detail1")} </span>
      </summary>
      <div className="insurance-body">
        <p className="insurance-intro"> {t("detail2")} </p>
        <div className="insurance-form">
          <label>
            {" "}
            {t("detail3")}{" "}
            <input
              value={caseReference}
              maxLength={80}
              placeholder={t("detail4")}
              onChange={(event) => setCaseReference(event.target.value)}
            />
          </label>
          <label>
            {" "}
            {t("detail5")}{" "}
            <select
              value={incidentKind}
              onChange={(event) =>
                onIncidentKind(event.target.value as IncidentKind)
              }
            >
              {incidentKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {t(incidentKindLabel(kind))}
                </option>
              ))}
            </select>
          </label>
          <label>
            {" "}
            {t("detail6")}{" "}
            <input
              type="datetime-local"
              value={incidentAt}
              onChange={(event) => onIncidentAt(event.target.value)}
            />
          </label>
          <label>
            {" "}
            {t("detail7")}{" "}
            <select
              value={radiusMeters}
              onChange={(event) => setRadiusMeters(Number(event.target.value))}
            >
              <option value={100}> {t("detail8")} </option>
              <option value={250}> {t("detail9")} </option>
              <option value={500}> {t("detail10")} </option>
              <option value={1000}> {t("detail11")} </option>
            </select>
          </label>
        </div>
        <div className="insurance-actions">
          <button
            className={picking ? "active" : ""}
            aria-pressed={picking}
            onClick={onPick}
          >
            <Icon name="pin" />{" "}
            {picking ? t("Нажмите место аварии") : t("Отметить аварию")}
          </button>
          {point && (
            <>
              <button onClick={() => void onShareIncident()}>
                {" "}
                {t("detail12")}{" "}
              </button>
              <button onClick={onClear}> {t("detail13")} </button>
            </>
          )}
        </div>
        {!point ? (
          <p className="insurance-hint"> {t("detail14")} </p>
        ) : (
          <>
            <div className="insurance-case" role="status">
              <strong>
                {t(incidentKindLabel(incidentKind))} · {candidates.length}{" "}
                {t("detail15")} {radiusMeters} {t("detail16")}{" "}
              </strong>
              <span>
                {" "}
                {t("detail17")} {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
              </span>
              <span>
                {usable.length} {t("detail18")}{" "}
                {candidates.length - usable.length} {t("detail19")}{" "}
              </span>
            </div>
            <div className="insurance-export">
              <button
                onClick={() =>
                  download(
                    "opole-insurance-case.json",
                    JSON.stringify(
                      insuranceCaseExport(
                        point,
                        incidentAt,
                        caseReference,
                        radiusMeters,
                        candidates,
                        t,
                      ),
                      null,
                      2,
                    ),
                  )
                }
              >
                {" "}
                {t("detail20")}{" "}
              </button>
              <button
                onClick={() =>
                  printCase(
                    point,
                    incidentAt,
                    caseReference,
                    radiusMeters,
                    candidates,
                    t,
                    locale,
                  )
                }
              >
                {" "}
                {t("detail21")}{" "}
              </button>
            </div>
            <p className="insurance-warning"> {t("detail22")} </p>
            <div className="insurance-candidates" aria-label={t("detail23")}>
              {candidates.length === 0 && (
                <p className="insurance-hint"> {t("detail24")} </p>
              )}
              {candidates.map((candidate) => (
                <article
                  key={candidate.camera.id}
                  className={"insurance-candidate " + candidate.priority}
                >
                  <div>
                    <button
                      className="insurance-camera"
                      onClick={() => onSelect(candidate.camera)}
                    >
                      <strong>{candidate.camera.name}</strong>
                      <span>
                        {candidate.camera.street} ·{" "}
                        {Math.round(candidate.distanceMeters)}{" "}
                        {t("detail16")}{" "}
                      </span>
                    </button>
                    <span className="insurance-priority">
                      {t(priorityLabel(candidate.priority))}
                    </span>
                  </div>
                  <p>{t(candidate.reason)}</p>
                  <div className="insurance-row-actions">
                    <button
                      onClick={async () => {
                        if (
                          await copy(
                            t("requestTemplate").replace(
                              /\{(name|street|time|reference|coordinates|distance)\}/g,
                              (_, key: string) =>
                                ({
                                  name: candidate.camera.name,
                                  street: candidate.camera.street,
                                  time: incidentAt || t("unspecified"),
                                  reference: caseReference || t("unspecified"),
                                  coordinates:
                                    candidate.camera.lat.toFixed(5) +
                                    ", " +
                                    candidate.camera.lng.toFixed(5),
                                  distance: String(
                                    Math.round(candidate.distanceMeters),
                                  ),
                                })[key as "name"],
                            ),
                            t("Скопируйте текст запроса"),
                          )
                        ) {
                          setCopiedId(candidate.camera.id);
                          setTimeout(() => setCopiedId(null), 1800);
                        }
                      }}
                    >
                      {copiedId === candidate.camera.id
                        ? t("Запрос скопирован")
                        : t("Скопировать запрос")}
                    </button>
                    {candidate.camera.sourceUrl && (
                      <a
                        href={candidate.camera.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {" "}
                        {t("detail25")}{" "}
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </details>
  );
}
