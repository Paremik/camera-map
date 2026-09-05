"use client";

import { useMemo, useState } from "react";
import type { Camera } from "@/lib/camera";
import { analysisSummary, camerasCsv, camerasGeoJson, selectionCameras, type AnalysisMode, type AnalysisSelection } from "@/lib/map-analysis";
import type { MapView } from "@/lib/map-state";
import { useI18n } from "@/lib/i18n";
import CameraViewAction from "./CameraViewAction";

type Props = {
  cameras: Camera[]; catalog: Camera[]; mode: AnalysisMode; selection: AnalysisSelection | null; view: MapView;
  onMode: (mode: AnalysisMode) => void; onClear: () => void; onPreset: (view: MapView) => void;
  onSelect: (camera: Camera) => void; onSnapshot: (camera: Camera) => void; onShare: () => Promise<boolean>;
};

const presets: { key: string; view: MapView }[] = [
  { key: "presetCenter", view: { lng: 17.9224, lat: 50.66855, zoom: 15.3, bearing: 0, pitch: 0 } },
  { key: "presetRynek", view: { lng: 17.9211, lat: 50.6672, zoom: 17.1, bearing: 0, pitch: 0 } },
  { key: "presetStation", view: { lng: 17.9263, lat: 50.6626, zoom: 16.2, bearing: 0, pitch: 0 } },
  { key: "presetWest", view: { lng: 17.8875, lat: 50.6690, zoom: 14.7, bearing: 0, pitch: 0 } },
];

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function AnalysisPanel(props: Props) {
  const { t } = useI18n();
  const [shared, setShared] = useState(false);
  const selected = useMemo(() => selectionCameras(props.cameras, props.selection), [props.cameras, props.selection]);
  const summary = analysisSummary(selected);
  const nearestViews = useMemo(() => [...props.cameras.filter(camera => camera.publicViewUrl || camera.snapshotSourceUrl)].sort((a, b) =>
    Math.hypot(a.lng - props.view.lng, a.lat - props.view.lat) - Math.hypot(b.lng - props.view.lng, b.lat - props.view.lat)).slice(0, 6), [props.cameras, props.view.lng, props.view.lat]);
  const its = props.catalog.filter(camera => camera.category === "its");
  const latestIts = its.map(camera => camera.note?.match(/\d{4}-\d{2}-\d{2}/)?.[0]).filter(Boolean).sort().at(-1) ?? "—";
  return <details className="analysis-panel">
    <summary>{t("analysisTools")}</summary>
    <div className="analysis-body">
      <section><h3>{t("savedViews")}</h3><div className="preset-grid">{presets.map(preset => <button key={preset.key} onClick={() => props.onPreset(preset.view)}>{t(preset.key)}</button>)}</div></section>
      <section><h3>{t("analyseMap")}</h3><div className="analysis-actions"><button aria-pressed={props.mode === "area"} onClick={() => props.onMode(props.mode === "area" ? "none" : "area")}>{t("selectArea")}</button><button aria-pressed={props.mode === "route"} onClick={() => props.onMode(props.mode === "route" ? "none" : "route")}>{t("selectRoute")}</button>{props.selection && <button onClick={props.onClear}>{t("clearAnalysis")}</button>}</div>
      {props.mode !== "none" && !props.selection && <p className="analysis-hint">{t(props.mode === "area" ? "areaHint" : "routeHint")}</p>}
      {props.selection && <div className="analysis-result" role="status"><strong>{summary.cameras} {t("cameras")}</strong><span>{summary.records} {t("recordsFound")} · {summary.verified} {t("verifiedShort")}</span><span>{summary.publicViews} {t("publicViewsShort")} · {summary.unknownOptics} {t("unknownOpticsShort")}</span><div><button onClick={() => download("opole-cameras.csv", camerasCsv(selected), "text/csv;charset=utf-8")}>CSV</button><button onClick={() => download("opole-cameras.geojson", JSON.stringify(camerasGeoJson(selected), null, 2), "application/geo+json")}>GeoJSON</button></div>{props.selection.mode === "route" && <small>{t("routeDisclaimer")}</small>}</div>}</section>
      <section><h3>{t("nearbyViews")}</h3><div className="preview-list">{nearestViews.map(camera => <div key={camera.id}><button onClick={() => props.onSelect(camera)}><strong>{camera.name}</strong><span>{camera.street}</span></button><CameraViewAction camera={camera} onSnapshot={props.onSnapshot} compact /></div>)}</div></section>
      <section><h3>{t("sourceStatus")}</h3><div className="source-health"><p><i className="ok" /><span>ITS Opole</span><b>{its.length}</b><small>{latestIts}</small></p><p><i className="ok" /><span>OpenStreetMap</span><b>{props.catalog.filter(camera => camera.sourceKind === "open-map").length}</b><small>{t("catalogLoaded")}</small></p><p><i className="ok" /><span>{t("publicViewsShort")}</span><b>{props.catalog.filter(camera => camera.publicViewUrl || camera.snapshotSourceUrl).length}</b><small>{t("onDemand")}</small></p><p><i className="reported-dot" /><span>{t("layerReported")}</span><b>{props.catalog.filter(camera => camera.sourceKind === "user-report").length}</b><small>{t("unverifiedShort")}</small></p></div></section>
      <section className="sharing-tools"><button onClick={async () => setShared(await props.onShare())}>{shared ? t("fullLinkCopied") : t("shareFullMap")}</button><button onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()}>{t("fullscreen")}</button><p>{t("shortcuts")}</p></section>
    </div>
  </details>;
}
