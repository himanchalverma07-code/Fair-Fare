"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Search, FileEdit, TowerControl, Clock } from "lucide-react";
import LocationInput from "@/components/LocationInput";
import FareEstimatorResult from "@/components/FareEstimatorResult";
import ReportFareForm from "@/components/ReportFareForm";
import { getDrivingDistance, type GeoPoint } from "@/lib/geo";
import type { FareEstimate } from "@/lib/fareLogic";

// Leaflet touches `window`, so the map must never render on the server.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-2xl border border-ink-100 bg-ink-100/60">
      <span className="text-xs font-medium text-ink-500">Loading map…</span>
    </div>
  ),
});

type Tab = "check" | "report";
type EstimateStatus = "idle" | "loading" | "found" | "not_found" | "error";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("check");

  const [start, setStart] = useState<GeoPoint | null>(null);
  const [end, setEnd] = useState<GeoPoint | null>(null);

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [routeGeoJson, setRouteGeoJson] = useState<GeoJSON.LineString | null>(
    null
  );
  const [isRouting, setIsRouting] = useState(false);

  const [estimateStatus, setEstimateStatus] = useState<EstimateStatus>("idle");
  const [estimate, setEstimate] = useState<FareEstimate | undefined>();
  const [estimateError, setEstimateError] = useState("");

  // Recalculate the driving route whenever both points are set
  useEffect(() => {
    if (!start || !end) {
      setDistanceKm(null);
      setDurationMin(null);
      setRouteGeoJson(null);
      return;
    }

    let cancelled = false;
    setIsRouting(true);

    getDrivingDistance(start, end)
      .then((route) => {
        if (cancelled) return;
        setDistanceKm(route.distanceKm);
        setDurationMin(route.durationMin);
        setRouteGeoJson(route.routeGeoJson);
      })
      .catch(() => {
        if (cancelled) return;
        setDistanceKm(null);
        setDurationMin(null);
        setRouteGeoJson(null);
      })
      .finally(() => {
        if (!cancelled) setIsRouting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [start, end]);

  // Fetch the crowdsourced fare estimate whenever we have a fresh distance
  useEffect(() => {
    if (!start || !end || !distanceKm || activeTab !== "check") {
      if (!start || !end) setEstimateStatus("idle");
      return;
    }

    let cancelled = false;
    setEstimateStatus("loading");

    fetch("/api/estimate-fare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: start.city, distanceKm }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setEstimateStatus("error");
          setEstimateError(data.error ?? "Something went wrong");
          return;
        }

        if (data.found) {
          setEstimate(data.estimate);
          setEstimateStatus("found");
        } else {
          setEstimateStatus("not_found");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setEstimateStatus("error");
        setEstimateError("Network error — check your connection");
      });

    return () => {
      cancelled = true;
    };
  }, [start, end, distanceKm, activeTab]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/90 px-5 pb-3 pt-5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-black text-white">
            स
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-tight text-ink-900">
              SahiBhada
            </h1>
            <p className="text-[11px] font-medium leading-tight text-ink-500">
              सही भाड़ा · Fair fares, crowdsourced
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-ink-100 p-1.5">
          <button
            onClick={() => setActiveTab("check")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-colors ${
              activeTab === "check"
                ? "bg-white text-brand-700 shadow-card"
                : "text-ink-500"
            }`}
          >
            <Search size={16} /> Check Fare
          </button>
          <button
            onClick={() => setActiveTab("report")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-colors ${
              activeTab === "report"
                ? "bg-white text-brand-700 shadow-card"
                : "text-ink-500"
            }`}
          >
            <FileEdit size={16} /> Report Fare
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 space-y-4 px-5 py-5 pb-safe">
        <div className="space-y-3 rounded-3xl bg-white p-4 shadow-card">
          <LocationInput
            label="From"
            placeholder="Railway station, bus stand, landmark…"
            icon="start"
            value={start}
            onSelect={setStart}
          />
          <LocationInput
            label="To"
            placeholder="Where are you headed?"
            icon="end"
            value={end}
            onSelect={setEnd}
          />

          <div className="h-44 w-full">
            <MapView
              start={start}
              end={end}
              routeGeoJson={routeGeoJson}
              className="h-full"
            />
          </div>

          {(start || end) && (
            <div className="flex items-center justify-center gap-4 rounded-xl bg-ink-100/60 py-2 text-xs font-semibold text-ink-700">
              <span className="flex items-center gap-1">
                <TowerControl size={13} />
                {isRouting
                  ? "Calculating…"
                  : distanceKm
                  ? `${distanceKm.toFixed(1)} km`
                  : "—"}
              </span>
              <span className="h-3 w-px bg-ink-300" />
              <span className="flex items-center gap-1">
                <Clock size={13} />
                {isRouting
                  ? "Calculating…"
                  : durationMin
                  ? `~${durationMin} min`
                  : "—"}
              </span>
            </div>
          )}
        </div>

        {activeTab === "check" ? (
          <FareEstimatorResult
            status={isRouting ? "loading" : estimateStatus}
            estimate={estimate}
            errorMessage={estimateError}
            distanceKm={distanceKm ?? undefined}
            durationMin={durationMin ?? undefined}
          />
        ) : (
          <ReportFareForm
            start={start}
            end={end}
            distanceKm={distanceKm}
            onSubmitted={() => {
              // Refresh the estimate cache implicitly next time "Check Fare"
              // is opened — no action needed here since that effect reruns
              // whenever activeTab flips back to "check".
            }}
          />
        )}

        <p className="pt-2 text-center text-[11px] leading-relaxed text-ink-500">
          Fares are self-reported by riders and shown as a community
          reference only — not an official or legally binding rate.
        </p>
      </main>
    </div>
  );
}
