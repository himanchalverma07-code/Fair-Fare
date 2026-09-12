"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { GeoPoint } from "@/lib/geo";

interface MapViewProps {
  start: GeoPoint | null;
  end: GeoPoint | null;
  routeGeoJson: GeoJSON.LineString | null;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [22.9734, 78.6569]; // Center of India
const DEFAULT_ZOOM = 5;

function makeDivIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
        background:${color};
        width:26px;height:26px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:2px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="
          transform:rotate(45deg);
          color:white;font-size:11px;font-weight:700;font-family:sans-serif;
        ">${label}</span>
      </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

const startIcon = makeDivIcon("#10b981", "A");
const endIcon = makeDivIcon("#ea580c", "B");

function FitBounds({ start, end }: { start: GeoPoint | null; end: GeoPoint | null }) {
  const map = useMap();

  useEffect(() => {
    if (start && end) {
      const bounds = L.latLngBounds(
        [start.lat, start.lng],
        [end.lat, end.lng]
      );
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    } else if (start) {
      map.setView([start.lat, start.lng], 14);
    } else if (end) {
      map.setView([end.lat, end.lng], 14);
    }
  }, [start, end, map]);

  return null;
}

export default function MapView({
  start,
  end,
  routeGeoJson,
  className = "",
}: MapViewProps) {
  const routeLatLngs: [number, number][] = useMemo(() => {
    if (!routeGeoJson?.coordinates) return [];
    return routeGeoJson.coordinates.map(([lng, lat]) => [lat, lng]);
  }, [routeGeoJson]);

  const fallbackLine: [number, number][] =
    start && end && routeLatLngs.length === 0
      ? [
          [start.lat, start.lng],
          [end.lat, end.lng],
        ]
      : [];

  return (
    <div className={`overflow-hidden rounded-2xl border border-ink-100 ${className}`}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {start && <Marker position={[start.lat, start.lng]} icon={startIcon} />}
        {end && <Marker position={[end.lat, end.lng]} icon={endIcon} />}

        {routeLatLngs.length > 0 && (
          <Polyline
            positions={routeLatLngs}
            pathOptions={{ color: "#ea580c", weight: 4, opacity: 0.85 }}
          />
        )}
        {fallbackLine.length > 0 && (
          <Polyline
            positions={fallbackLine}
            pathOptions={{
              color: "#ea580c",
              weight: 3,
              opacity: 0.6,
              dashArray: "6 8",
            }}
          />
        )}

        <FitBounds start={start} end={end} />
      </MapContainer>
    </div>
  );
}
