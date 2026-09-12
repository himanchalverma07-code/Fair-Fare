"use client";

import {
  IndianRupee,
  TrendingUp,
  Users,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Ruler,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import type { FareEstimate } from "@/lib/fareLogic";

interface FareEstimatorResultProps {
  status: "idle" | "loading" | "found" | "not_found" | "error";
  estimate?: FareEstimate;
  errorMessage?: string;
  distanceKm?: number;
  durationMin?: number;
}

const CONFIDENCE_CONFIG = {
  high: {
    icon: ShieldCheck,
    label: "High confidence",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  medium: {
    icon: Shield,
    label: "Medium confidence",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  low: {
    icon: ShieldAlert,
    label: "Low confidence — few reports",
    color: "text-red-500",
    bg: "bg-red-50",
  },
} as const;

export default function FareEstimatorResult({
  status,
  estimate,
  errorMessage,
  distanceKm,
  durationMin,
}: FareEstimatorResultProps) {
  if (status === "idle") {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-ink-300 bg-white/60 px-6 py-10 text-center">
        <Sparkles className="mb-3 text-ink-300" size={32} />
        <p className="text-sm font-medium text-ink-500">
          Pick a start and end point to see the fair-market fare
        </p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="animate-fade-in rounded-3xl bg-white p-6 shadow-card">
        <div className="mb-4 h-4 w-32 animate-pulse rounded-full bg-ink-100" />
        <div className="mb-2 h-12 w-40 animate-pulse rounded-full bg-ink-100" />
        <div className="h-4 w-56 animate-pulse rounded-full bg-ink-100" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="animate-fade-in flex items-start gap-3 rounded-3xl border border-red-200 bg-red-50 p-5">
        <AlertTriangle className="mt-0.5 shrink-0 text-red-500" size={20} />
        <div>
          <p className="text-sm font-semibold text-red-700">
            Couldn&apos;t fetch the fare estimate
          </p>
          <p className="mt-0.5 text-sm text-red-600">
            {errorMessage ?? "Please try again in a moment."}
          </p>
        </div>
      </div>
    );
  }

  if (status === "not_found") {
    return (
      <div className="animate-slide-up rounded-3xl border-2 border-dashed border-brand-300 bg-brand-50 p-6 text-center">
        <Users className="mx-auto mb-3 text-brand-500" size={32} />
        <p className="text-sm font-semibold text-ink-800">
          No fare reports yet for this route
        </p>
        <p className="mt-1 text-sm text-ink-500">
          {distanceKm ? `That's about ${distanceKm.toFixed(1)} km. ` : ""}
          Be the first to report what you pay — switch to the &quot;Report
          Fare&quot; tab after your ride.
        </p>
      </div>
    );
  }

  if (status === "found" && estimate) {
    const conf = CONFIDENCE_CONFIG[estimate.confidence];
    const ConfIcon = conf.icon;

    return (
      <div className="animate-slide-up overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="bg-gradient-to-br from-brand-600 to-brand-500 px-6 pb-6 pt-5 text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-100">
              Average Crowdsourced Fare
            </span>
            <div className={`flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold`}>
              <ConfIcon size={12} />
              {conf.label}
            </div>
          </div>

          <div className="mt-2 flex items-end gap-1">
            <IndianRupee size={28} strokeWidth={2.5} className="mb-1.5" />
            <span className="text-5xl font-extrabold tracking-tight">
              {estimate.avgFare}
            </span>
          </div>

          <p className="mt-1 text-sm text-brand-100">
            ≈ ₹{estimate.avgFarePerKm}/km · {estimate.distanceKm.toFixed(1)} km
            {durationMin ? ` · ~${durationMin} min` : ""}
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-ink-100 border-b border-ink-100">
          <div className="px-5 py-4">
            <div className="mb-1 flex items-center gap-1.5 text-ink-500">
              <TrendingUp size={14} />
              <span className="text-xs font-medium">Fair range</span>
            </div>
            <p className="text-sm font-bold text-ink-900">
              ₹{estimate.suggestedFareRange.low}–₹{estimate.suggestedFareRange.high}
            </p>
          </div>
          <div className="px-5 py-4">
            <div className="mb-1 flex items-center gap-1.5 text-ink-500">
              <Users size={14} />
              <span className="text-xs font-medium">Based on</span>
            </div>
            <p className="text-sm font-bold text-ink-900">
              {estimate.sampleSize} rider{estimate.sampleSize === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-3.5">
          <Ruler size={14} className="shrink-0 text-ink-500" />
          <p className="text-xs text-ink-500">
            Matched against trips within ±{estimate.matchedDistanceWindowKm} km
            in {estimate.city}. Meter fares in most Indian cities run
            ₹15–₹20 base + ₹12–₹18/km — use this as your negotiation anchor,
            not a legal rate.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
