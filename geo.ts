// ============================================================================
// lib/geo.ts
//
// This is the ONLY file that talks to an external maps/geocoding provider.
// Swap Nominatim/OSRM for Google Maps or Mapbox by rewriting the two
// exported functions below — every component calls only these.
// ============================================================================

export interface GeoPoint {
  lat: number;
  lng: number;
  displayName: string;
  city: string;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  routeGeoJson: GeoJSON.LineString | null;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const OSRM_BASE = "https://router.project-osrm.org";

/**
 * Free-text place search, biased toward India. Debounce calls to this in
 * the UI — Nominatim's public instance asks for max 1 request/second.
 */
export async function searchPlaces(query: string): Promise<GeoPoint[]> {
  if (!query || query.trim().length < 3) return [];

  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  url.searchParams.set("countrycodes", "in");

  const res = await fetch(url.toString(), {
    headers: {
      "Accept-Language": "en",
    },
  });

  if (!res.ok) {
    throw new Error(`Geocoding failed with status ${res.status}`);
  }

  const data: Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: Record<string, string>;
  }> = await res.json();

  return data.map((item) => {
    const address = item.address ?? {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.state_district ||
      address.state ||
      "Unknown";

    return {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
      city,
    };
  });
}

/**
 * Reverse-geocode a lat/lng dropped/dragged on the map back into a place
 * name + city, used when the user moves a marker instead of typing.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeoPoint> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: { "Accept-Language": "en" },
  });

  if (!res.ok) {
    throw new Error(`Reverse geocoding failed with status ${res.status}`);
  }

  const item: {
    display_name: string;
    address?: Record<string, string>;
  } = await res.json();

  const address = item.address ?? {};
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.state_district ||
    address.state ||
    "Unknown";

  return {
    lat,
    lng,
    displayName: item.display_name,
    city,
  };
}

/**
 * Real driving-route distance (not straight-line) between two points, via
 * the public OSRM demo server. Falls back to a haversine + road-factor
 * estimate if OSRM is unreachable, so the app never hard-fails on the
 * core "distance" number.
 */
export async function getDrivingDistance(
  start: GeoPoint,
  end: GeoPoint
): Promise<RouteResult> {
  try {
    const url =
      `${OSRM_BASE}/route/v1/driving/` +
      `${start.lng},${start.lat};${end.lng},${end.lat}` +
      `?overview=full&geometries=geojson`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM responded with ${res.status}`);

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) {
      throw new Error("OSRM returned no route");
    }

    const route = data.routes[0];
    return {
      distanceKm: Math.round((route.distance / 1000) * 100) / 100,
      durationMin: Math.round(route.duration / 60),
      routeGeoJson: route.geometry,
    };
  } catch (err) {
    // Fallback: haversine distance * 1.3 road-winding factor, average
    // city-traffic speed of 20 km/h to estimate duration.
    const distanceKm = haversineKm(start, end) * 1.3;
    return {
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMin: Math.round((distanceKm / 20) * 60),
      routeGeoJson: null,
    };
  }
}

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
