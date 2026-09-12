import { createClient } from "@supabase/supabase-js";

export type VehicleType = "auto_rickshaw" | "shared_auto" | "e_rickshaw";
export type TimeOfDay = "day" | "night";

export interface TripRow {
  id: string;
  start_name: string;
  end_name: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  city: string;
  distance_km: number;
  fare_paid: number;
  fare_per_km: number;
  vehicle_type: VehicleType;
  time_of_day: TimeOfDay;
  had_meter: boolean;
  notes: string | null;
  created_at: string;
}

export interface TripInsert {
  start_name: string;
  end_name: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  city: string;
  distance_km: number;
  fare_paid: number;
  vehicle_type: VehicleType;
  time_of_day: TimeOfDay;
  had_meter: boolean;
  notes?: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Thrown only at build/runtime when actually invoked, not at import time
  // of files that merely re-export types, so this stays safe for tooling.
  console.warn(
    "SahiBhada: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "are not set. Add them to .env.local — see README.md."
  );
}

export const supabase = createClient(
  supabaseUrl ?? "",
  supabaseAnonKey ?? ""
);
