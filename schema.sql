-- ============================================================================
-- SahiBhada (FairFare) — Supabase / PostgreSQL schema
-- Run this entire file in the Supabase SQL editor (Project → SQL Editor).
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- Table: trips
-- One row per crowdsourced auto-rickshaw trip report.
-- ----------------------------------------------------------------------------
create table if not exists public.trips (
  id uuid primary key default uuid_generate_v4(),

  -- Human-readable place names as typed/selected by the user
  start_name text not null,
  end_name text not null,

  -- Coordinates, for future map clustering / re-geocoding audits
  start_lat double precision not null,
  start_lng double precision not null,
  end_lat double precision not null,
  end_lng double precision not null,

  -- City is required so fare stats never mix rates across cities
  city text not null,

  -- Driving distance in kilometers, auto-calculated client-side via OSRM
  distance_km numeric(6, 2) not null check (distance_km > 0 and distance_km < 200),

  -- What the passenger actually paid, in rupees
  fare_paid numeric(8, 2) not null check (fare_paid > 0 and fare_paid < 5000),

  -- Derived, stored for fast querying/sorting without recomputing
  fare_per_km numeric(8, 2) generated always as (round(fare_paid / distance_km, 2)) stored,

  -- Optional context
  vehicle_type text not null default 'auto_rickshaw'
    check (vehicle_type in ('auto_rickshaw', 'shared_auto', 'e_rickshaw')),
  time_of_day text not null default 'day'
    check (time_of_day in ('day', 'night')),
  had_meter boolean not null default false,
  notes text,

  -- Lightweight abuse control: hash of submitter's IP, never the raw IP
  submitter_fingerprint text,

  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Indexes to make the fare-estimate query (city + distance range) fast
-- ----------------------------------------------------------------------------
create index if not exists idx_trips_city on public.trips (city);
create index if not exists idx_trips_city_distance on public.trips (city, distance_km);
create index if not exists idx_trips_created_at on public.trips (created_at desc);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- No-login app: anonymous (anon) role may INSERT and SELECT, but never
-- UPDATE or DELETE. This lets the browser talk to Supabase directly with
-- only the public anon key, with no way for a client to tamper with or
-- erase existing reports.
-- ----------------------------------------------------------------------------
alter table public.trips enable row level security;

create policy "Anyone can submit a trip report"
  on public.trips
  for insert
  to anon
  with check (true);

create policy "Anyone can read trip reports for fare estimates"
  on public.trips
  for select
  to anon
  using (true);

-- Explicitly no UPDATE or DELETE policy for anon — those operations are
-- denied by default once RLS is enabled, which is exactly what we want.

-- ----------------------------------------------------------------------------
-- View: city_route_stats
-- Pre-aggregated average fare-per-km per city, bucketed into 1km distance
-- bands. The API route also computes this on the fly for a specific
-- distance, but this view is useful for an admin dashboard / sanity checks.
-- ----------------------------------------------------------------------------
create or replace view public.city_route_stats as
select
  city,
  width_bucket(distance_km, 0, 30, 30) as distance_bucket_km,
  count(*) as sample_size,
  round(avg(fare_per_km), 2) as avg_fare_per_km,
  round(min(fare_per_km), 2) as min_fare_per_km,
  round(max(fare_per_km), 2) as max_fare_per_km,
  round(avg(fare_paid), 2) as avg_fare_paid
from public.trips
group by city, distance_bucket_km;
