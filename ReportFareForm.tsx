"use client";

import { useState } from "react";
import {
  IndianRupee,
  Bike,
  Users2,
  Zap,
  Sun,
  Moon,
  Gauge,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import type { GeoPoint } from "@/lib/geo";
import type { VehicleType, TimeOfDay } from "@/lib/supabaseClient";

interface ReportFareFormProps {
  start: GeoPoint | null;
  end: GeoPoint | null;
  distanceKm: number | null;
  onSubmitted?: () => void;
}

const VEHICLE_OPTIONS: { value: VehicleType; label: string; icon: typeof Bike }[] = [
  { value: "auto_rickshaw", label: "Auto", icon: Bike },
  { value: "shared_auto", label: "Shared Auto", icon: Users2 },
  { value: "e_rickshaw", label: "E-Rickshaw", icon: Zap },
];

export default function ReportFareForm({
  start,
  end,
  distanceKm,
  onSubmitted,
}: ReportFareFormProps) {
  const [farePaid, setFarePaid] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("auto_rickshaw");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("day");
  const [hadMeter, setHadMeter] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit =
    start !== null &&
    end !== null &&
    distanceKm !== null &&
    distanceKm > 0 &&
    parseFloat(farePaid) > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !start || !end || !distanceKm) return;

    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/report-fare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_name: start.displayName,
          end_name: end.displayName,
          start_lat: start.lat,
          start_lng: start.lng,
          end_lat: end.lat,
          end_lng: end.lng,
          city: start.city,
          distance_km: distanceKm,
          fare_paid: parseFloat(farePaid),
          vehicle_type: vehicleType,
          time_of_day: timeOfDay,
          had_meter: hadMeter,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setFarePaid("");
      setNotes("");
      setHadMeter(false);
      onSubmitted?.();
    } catch {
      setStatus("error");
      setErrorMessage("Network error — check your connection and try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="animate-slide-up flex flex-col items-center rounded-3xl bg-white p-8 text-center shadow-card">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="text-emerald-500" size={32} />
        </div>
        <h3 className="text-lg font-bold text-ink-900">Thanks for reporting!</h3>
        <p className="mt-1.5 text-sm text-ink-500">
          Your fare has been added to the crowdsourced data. This helps the
          next rider negotiate a fair price.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-5 rounded-full bg-ink-900 px-6 py-2.5 text-sm font-semibold text-white active:scale-95"
        >
          Report another trip
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-slide-up space-y-5 rounded-3xl bg-white p-5 shadow-card"
    >
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
          Fare Paid
        </label>
        <div className="flex items-center gap-2 rounded-2xl border-2 border-ink-100 bg-ink-100/40 px-4 py-3.5 focus-within:border-brand-500">
          <IndianRupee size={22} className="shrink-0 text-brand-600" />
          <input
            type="number"
            inputMode="decimal"
            min="1"
            max="5000"
            step="1"
            required
            value={farePaid}
            onChange={(e) => setFarePaid(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent text-3xl font-extrabold text-ink-900 placeholder:text-ink-300 focus:outline-none"
          />
        </div>
        {distanceKm && farePaid && parseFloat(farePaid) > 0 && (
          <p className="mt-1.5 text-xs font-medium text-ink-500">
            ≈ ₹{(parseFloat(farePaid) / distanceKm).toFixed(1)}/km over{" "}
            {distanceKm.toFixed(1)} km
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-500">
          Vehicle Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {VEHICLE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setVehicleType(value)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 text-xs font-semibold transition-colors ${
                vehicleType === value
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-ink-100 text-ink-500"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-500">
            Time of Day
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTimeOfDay("day")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 py-3 text-xs font-semibold ${
                timeOfDay === "day"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-ink-100 text-ink-500"
              }`}
            >
              <Sun size={16} /> Day
            </button>
            <button
              type="button"
              onClick={() => setTimeOfDay("night")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 py-3 text-xs font-semibold ${
                timeOfDay === "night"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-ink-100 text-ink-500"
              }`}
            >
              <Moon size={16} /> Night
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-500">
            Meter Used?
          </label>
          <button
            type="button"
            onClick={() => setHadMeter(!hadMeter)}
            className={`flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 py-3 text-xs font-semibold ${
              hadMeter
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-ink-100 text-ink-500"
            }`}
          >
            <Gauge size={16} /> {hadMeter ? "Yes, metered" : "No, negotiated"}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
          Notes <span className="normal-case text-ink-300">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="e.g. Heavy traffic, late-night surcharge, driver refused meter..."
          className="w-full resize-none rounded-2xl border-2 border-ink-100 bg-ink-100/40 px-4 py-3 text-sm text-ink-800 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none"
        />
      </div>

      {status === "error" && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 p-3.5 text-sm text-red-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {errorMessage}
        </div>
      )}

      {!start || !end ? (
        <p className="text-center text-xs font-medium text-ink-500">
          Select a start and end point above to enable submission
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit || status === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 text-sm font-bold text-white shadow-card transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-300"
      >
        {status === "submitting" ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Fare Report"
        )}
      </button>
    </form>
  );
}
