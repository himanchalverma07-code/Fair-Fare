# SahiBhada (सही भाड़ा — "Fair Fare")

Crowdsourced auto-rickshaw fare transparency for India. No login. Check a fair
price before you get in. Report what you actually paid after you get out.

## Why Leaflet + OSM + OSRM instead of Google Maps / Mapbox

Google Maps and Mapbox both require a billing-enabled API key before a single
request works, which kills the "zero friction, no login" goal for a
demo/OSS-first project like this. This build uses:

- **Leaflet + OpenStreetMap** tiles for the map itself (free, no key).
- **Nominatim** (OSM) for geocoding place names to lat/lng (free, no key,
  rate-limited — fine for this use case, swap for a paid geocoder at scale).
- **OSRM public demo server** for real driving-distance/route calculation
  (free, no key, not for high production volume — self-host OSRM or swap in
  Mapbox Directions/Google Directions API by replacing `lib/geo.ts` only —
  every other file is decoupled from the provider).

To swap providers later, you only ever touch `lib/geo.ts`. Nothing else in
the app imports a maps SDK directly.

## 1. Initialize the project

```bash
npx create-next-app@14 sahibhada --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
cd sahibhada
```

Then copy every file from this deliverable into the matching path (they
overwrite/extend the scaffold), or simply use the files as provided here as
your project root.

## 2. Install dependencies

```bash
npm install leaflet react-leaflet @supabase/supabase-js lucide-react
npm install -D @types/leaflet
```

## 3. Environment variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

Get both from your Supabase project → Settings → API. The anon key is safe
to expose client-side; row-level security (below) is what keeps it safe.

## 4. Set up the database

Open the Supabase SQL editor and run `supabase/schema.sql` (provided in this
deliverable) in full. It creates the `trips` table, indexes, and row-level
security policies that allow anonymous insert + select (no login) while
blocking update/delete from the client.

## 5. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`.

## 6. Deploy

```bash
npm install -g vercel
vercel
```

Add the two env vars in the Vercel project dashboard (Settings →
Environment Variables) before the first production deploy.

## Project structure

```
sahibhada/
├── app/
│   ├── layout.tsx                  Root layout, fonts, metadata
│   ├── page.tsx                    Main screen: tab switcher (Check/Report)
│   ├── globals.css                 Tailwind base + Leaflet CSS overrides
│   └── api/
│       ├── estimate-fare/route.ts  POST: distance-bucketed average fare
│       └── report-fare/route.ts    POST: validate + insert a trip report
├── components/
│   ├── MapView.tsx                 Leaflet map, two draggable markers
│   ├── LocationInput.tsx           Autocomplete text input (Nominatim)
│   ├── FareEstimatorResult.tsx     Result card: avg ₹, ₹/km, sample size
│   └── ReportFareForm.tsx          Full "Report Fare" form + submit flow
├── lib/
│   ├── supabaseClient.ts           Typed Supabase browser client
│   ├── geo.ts                      geocode() + getDrivingDistanceKm()
│   └── fareLogic.ts                Distance-bucketing + stats helpers
└── supabase/
    └── schema.sql                  Table, indexes, RLS policies
```
