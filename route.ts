import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computeFareEstimate } from "@/lib/fareLogic";
import type { TripRow } from "@/lib/supabaseClient";

export const runtime = "nodejs";

interface EstimateRequestBody {
  city: string;
  distanceKm: number;
}

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  let body: EstimateRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const { city, distanceKm } = body;

  if (!city || typeof city !== "string" || city.trim().length === 0) {
    return NextResponse.json(
      { error: "A valid 'city' string is required" },
      { status: 400 }
    );
  }

  if (
    typeof distanceKm !== "number" ||
    Number.isNaN(distanceKm) ||
    distanceKm <= 0 ||
    distanceKm > 200
  ) {
    return NextResponse.json(
      { error: "'distanceKm' must be a number between 0 and 200" },
      { status: 400 }
    );
  }

  try {
    const supabase = getServerSupabase();

    // Pull a reasonably wide window server-side so fareLogic can progressively
    // narrow/widen it in memory without round-tripping to the DB repeatedly.
    const lowerBound = Math.max(0, distanceKm - 6);
    const upperBound = distanceKm + 6;

    const { data, error } = await supabase
      .from("trips")
      .select(
        "id, start_name, end_name, start_lat, start_lng, end_lat, end_lng, city, distance_km, fare_paid, fare_per_km, vehicle_type, time_of_day, had_meter, notes, created_at"
      )
      .ilike("city", city.trim())
      .gte("distance_km", lowerBound)
      .lte("distance_km", upperBound)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json(
        { error: `Database query failed: ${error.message}` },
        { status: 500 }
      );
    }

    const trips = (data ?? []) as TripRow[];
    const estimate = computeFareEstimate(trips, city.trim(), distanceKm);

    if (!estimate) {
      return NextResponse.json(
        {
          found: false,
          message:
            "No fare reports yet for this route. Be the first to report your fare!",
          city: city.trim(),
          distanceKm,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ found: true, estimate }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
