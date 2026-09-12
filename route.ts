import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import type { TripInsert, VehicleType, TimeOfDay } from "@/lib/supabaseClient";

export const runtime = "nodejs";

const VALID_VEHICLE_TYPES: VehicleType[] = [
  "auto_rickshaw",
  "shared_auto",
  "e_rickshaw",
];
const VALID_TIMES_OF_DAY: TimeOfDay[] = ["day", "night"];

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createClient(url, key);
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function POST(request: NextRequest) {
  let body: Partial<TripInsert>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const errors: string[] = [];

  if (!body.start_name || body.start_name.trim().length === 0) {
    errors.push("start_name is required");
  }
  if (!body.end_name || body.end_name.trim().length === 0) {
    errors.push("end_name is required");
  }
  if (!body.city || body.city.trim().length === 0) {
    errors.push("city is required");
  }
  if (
    typeof body.start_lat !== "number" ||
    typeof body.start_lng !== "number" ||
    typeof body.end_lat !== "number" ||
    typeof body.end_lng !== "number"
  ) {
    errors.push("start/end coordinates must be numbers");
  }
  if (
    typeof body.distance_km !== "number" ||
    body.distance_km <= 0 ||
    body.distance_km > 200
  ) {
    errors.push("distance_km must be a number between 0 and 200");
  }
  if (
    typeof body.fare_paid !== "number" ||
    body.fare_paid <= 0 ||
    body.fare_paid > 5000
  ) {
    errors.push("fare_paid must be a number between 0 and 5000");
  }
  if (
    body.vehicle_type &&
    !VALID_VEHICLE_TYPES.includes(body.vehicle_type as VehicleType)
  ) {
    errors.push(`vehicle_type must be one of ${VALID_VEHICLE_TYPES.join(", ")}`);
  }
  if (
    body.time_of_day &&
    !VALID_TIMES_OF_DAY.includes(body.time_of_day as TimeOfDay)
  ) {
    errors.push(`time_of_day must be one of ${VALID_TIMES_OF_DAY.join(", ")}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  // Sanity check: fare-per-km outside a generous 5-100 range is almost
  // certainly a typo (missing zero, decimal point error, etc). Reject
  // rather than silently poisoning the averages everyone else relies on.
  const farePerKm = body.fare_paid! / body.distance_km!;
  if (farePerKm < 5 || farePerKm > 150) {
    return NextResponse.json(
      {
        error: `That works out to ₹${farePerKm.toFixed(
          1
        )}/km, which looks like a data entry error. Please double-check the fare and distance.`,
      },
      { status: 400 }
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? "unknown";

  try {
    const supabase = getServerSupabase();

    const { data, error } = await supabase
      .from("trips")
      .insert({
        start_name: body.start_name!.trim(),
        end_name: body.end_name!.trim(),
        start_lat: body.start_lat,
        start_lng: body.start_lng,
        end_lat: body.end_lat,
        end_lng: body.end_lng,
        city: body.city!.trim(),
        distance_km: body.distance_km,
        fare_paid: body.fare_paid,
        vehicle_type: body.vehicle_type ?? "auto_rickshaw",
        time_of_day: body.time_of_day ?? "day",
        had_meter: body.had_meter ?? false,
        notes: body.notes?.trim() || null,
        submitter_fingerprint: hashIp(ip),
      })
      .select("id, city, distance_km, fare_paid, fare_per_km, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Could not save your report: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Thanks! Your fare report helps the next rider.",
        trip: data,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
