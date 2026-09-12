import type { TripRow } from "./supabaseClient";

export interface FareEstimate {
  city: string;
  distanceKm: number;
  sampleSize: number;
  avgFare: number;
  avgFarePerKm: number;
  suggestedFareRange: { low: number; high: number };
  confidence: "low" | "medium" | "high";
  matchedDistanceWindowKm: number;
}

/**
 * How far (in km) either side of the requested distance we're willing to
 * widen the search if the exact +/-0.5km window doesn't have enough data.
 * Widens progressively so short trips (where 1km matters a lot) still get
 * a tight comparison, while it's more forgiving for longer trips.
 */
const WIDENING_STEPS_KM = [0.5, 1, 2, 4, 6];
const MIN_USABLE_SAMPLE = 3;

/**
 * Trim the top and bottom 10% of fare-per-km values before averaging, so a
 * single wildly overcharged or joke-low report doesn't skew the "fair
 * fare" for everyone else.
 */
function trimmedMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * 0.1);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  const usable = trimmed.length > 0 ? trimmed : sorted;
  return usable.reduce((sum, v) => sum + v, 0) / usable.length;
}

export function computeFareEstimate(
  trips: TripRow[],
  city: string,
  distanceKm: number
): FareEstimate | null {
  const cityTrips = trips.filter(
    (t) => t.city.toLowerCase() === city.toLowerCase()
  );

  if (cityTrips.length === 0) return null;

  let matched: TripRow[] = [];
  let usedWindow = WIDENING_STEPS_KM[0];

  for (const window of WIDENING_STEPS_KM) {
    matched = cityTrips.filter(
      (t) =>
        t.distance_km >= distanceKm - window &&
        t.distance_km <= distanceKm + window
    );
    usedWindow = window;
    if (matched.length >= MIN_USABLE_SAMPLE) break;
  }

  if (matched.length === 0) return null;

  const farePerKmValues = matched.map((t) => t.fare_per_km);
  const avgFarePerKm = Math.round(trimmedMean(farePerKmValues) * 100) / 100;
  const avgFare = Math.round(avgFarePerKm * distanceKm * 100) / 100;

  const sorted = [...farePerKmValues].sort((a, b) => a - b);
  const p25 = percentile(sorted, 25);
  const p75 = percentile(sorted, 75);

  const confidence: FareEstimate["confidence"] =
    matched.length >= 15 ? "high" : matched.length >= 6 ? "medium" : "low";

  return {
    city,
    distanceKm,
    sampleSize: matched.length,
    avgFare,
    avgFarePerKm,
    suggestedFareRange: {
      low: Math.round(p25 * distanceKm),
      high: Math.round(p75 * distanceKm),
    },
    confidence,
    matchedDistanceWindowKm: usedWindow,
  };
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}
