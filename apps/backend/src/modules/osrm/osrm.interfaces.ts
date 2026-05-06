/**
 * OSRM (Open Source Routing Machine) — Interface definitions.
 *
 * OSRM API docs: https://project-osrm.org/docs/v5.24.0/api/
 */

// ─── Input ───────────────────────────────────────────────────────────
export interface OsrmCoordinate {
  readonly lng: number;
  readonly lat: number;
}

// ─── /route response ─────────────────────────────────────────────────
export interface OsrmLeg {
  readonly distance: number; // meters
  readonly duration: number; // seconds
}

/** GeoJSON LineString trả về khi gọi ?geometries=geojson */
export interface OsrmGeoJsonGeometry {
  readonly type: 'LineString';
  readonly coordinates: readonly (readonly [number, number])[]; // [lng, lat]
}

export interface OsrmRoute {
  readonly distance: number; // meters
  readonly duration: number; // seconds
  readonly legs: readonly OsrmLeg[];
  /**
   * Hình dạng đường.
   *   - string: polyline5 encoding (mặc định)
   *   - OsrmGeoJsonGeometry: khi gọi với ?geometries=geojson
   *   - undefined: khi gọi với ?overview=false
   */
  readonly geometry?: string | OsrmGeoJsonGeometry;
}

export interface OsrmRouteResponse {
  readonly code: string; // 'Ok' on success
  readonly routes: readonly OsrmRoute[];
}

// ─── /table response ─────────────────────────────────────────────────
export interface OsrmTableResponse {
  readonly code: string;
  readonly durations: readonly (readonly (number | null)[])[];
  readonly distances: readonly (readonly (number | null)[])[];
}

// ─── /nearest response ───────────────────────────────────────────────
export interface OsrmWaypoint {
  readonly distance: number; // meters — straight-line to snapped point
  readonly location: readonly [number, number]; // [lng, lat]
  readonly name: string;
}

export interface OsrmNearestResponse {
  readonly code: string;
  readonly waypoints: readonly OsrmWaypoint[];
}

// ─── Service return types ────────────────────────────────────────────
export interface RouteResult {
  readonly distanceMeters: number;
  readonly durationSeconds: number;
}

export interface TableEntry {
  readonly distanceMeters: number | null;
  readonly durationSeconds: number | null;
}

export interface NearestResult {
  readonly snappedLng: number;
  readonly snappedLat: number;
  readonly distanceMeters: number;
  readonly roadName: string;
}
