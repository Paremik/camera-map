"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { Camera, cameras } from "@/data/cameras";

type Position = [number, number];

function destinationPoint(lat: number, lng: number, bearingDeg: number, distanceM: number): Position {
  const R = 6371000;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lng * Math.PI) / 180;
  const d = distanceM / R;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );

  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

function cameraSector(camera: Camera) {
  const points: Position[] = [[camera.lng, camera.lat]];
  const start = camera.heading - camera.fov / 2;
  const end = camera.heading + camera.fov / 2;
  const steps = 24;

  for (let i = 0; i <= steps; i++) {
    const bearing = start + ((end - start) * i) / steps;
    points.push(destinationPoint(camera.lat, camera.lng, bearing, camera.rangeMeters));
  }
  points.push([camera.lng, camera.lat]);

  return {
    type: "Feature" as const,
    properties: { id: camera.id, name: camera.name },
    geometry: { type: "Polygon" as const, coordinates: [points] }
  };
}

function sectorsGeoJson() {
  return {
    type: "FeatureCollection" as const,
    features: cameras.map(cameraSector)
  };
}

export default function CameraMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [selected, setSelected] = useState<Camera | null>(cameras[0] ?? null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [17.9232, 50.6663],
      zoom: 15.2,
      pitch: 48,
      bearing: -12,
      antialias: true,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors"
          }
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }]
      }
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      map.addSource("camera-sectors", { type: "geojson", data: sectorsGeoJson() });
      map.addLayer({
        id: "camera-sectors-fill",
        type: "fill",
        source: "camera-sectors",
        paint: { "fill-color": "#ff4d4f", "fill-opacity": 0.18 }
      });
      map.addLayer({
        id: "camera-sectors-line",
        type: "line",
        source: "camera-sectors",
        paint: { "line-color": "#ff4d4f", "line-width": 1.5, "line-opacity": 0.8 }
      });

      cameras.forEach((camera) => {
        const button = document.createElement("button");
        button.className = "camera-marker";
        button.type = "button";
        button.title = camera.name;
        button.innerHTML = "◉";
        button.addEventListener("click", () => {
          setSelected(camera);
          map.flyTo({ center: [camera.lng, camera.lat], zoom: Math.max(map.getZoom(), 16), essential: true });
        });

        new maplibregl.Marker({ element: button, anchor: "center" })
          .setLngLat([camera.lng, camera.lat])
          .addTo(map);
      });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  function selectCamera(camera: Camera) {
    setSelected(camera);
    mapRef.current?.flyTo({ center: [camera.lng, camera.lat], zoom: 16.5, pitch: 55, essential: true });
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div>
            <p className="eyebrow">OPole / MVP</p>
            <h1>Camera Map</h1>
          </div>
          <span className="status-dot" title="MVP" />
        </div>

        <p className="intro">
          Публичные камеры и ориентировочные сектора обзора. Точные углы и дальность добавляем только после проверки источника.
        </p>

        <div className="camera-list">
          {cameras.map((camera) => (
            <button
              key={camera.id}
              className={selected?.id === camera.id ? "camera-item active" : "camera-item"}
              onClick={() => selectCamera(camera)}
            >
              <span className="camera-icon">●</span>
              <span>
                <strong>{camera.name}</strong>
                <small>{camera.rangeMeters} м · {camera.fov}°</small>
              </span>
            </button>
          ))}
        </div>

        {selected && (
          <section className="details-card">
            <div className="details-title">
              <span>Выбрана камера</span>
              <strong>{selected.name}</strong>
            </div>
            <dl>
              <div><dt>Направление</dt><dd>{selected.heading}°</dd></div>
              <div><dt>Угол</dt><dd>{selected.fov}°</dd></div>
              <div><dt>Дальность</dt><dd>~{selected.rangeMeters} м</dd></div>
            </dl>
            {selected.note && <p className="note">{selected.note}</p>}
            {selected.publicViewUrl && (
              <a href={selected.publicViewUrl} target="_blank" rel="noreferrer" className="view-button">
                Открыть публичный вид ↗
              </a>
            )}
          </section>
        )}
      </aside>

      <main className="map-wrap">
        <div ref={containerRef} className="map" />
        <div className="map-badge">3D prototype · MapLibre + OSM</div>
      </main>
    </div>
  );
}
