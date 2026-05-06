import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OsrmCoordinate,
  OsrmRouteResponse,
  OsrmTableResponse,
  OsrmNearestResponse,
  RouteResult,
  TableEntry,
  NearestResult,
} from './osrm.interfaces';

/**
 * OsrmService — HTTP client cho OSRM self-hosted.
 *
 * Sử dụng Node 20 built-in `fetch` (không cần axios).
 * Nếu OSRM không khả dụng, các method trả fallback đường chim bay.
 */
@Injectable()
export class OsrmService implements OnModuleInit {
  private readonly logger = new Logger(OsrmService.name);
  private baseUrl: string;
  private available = false;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('OSRM_URL')!;
  }

  async onModuleInit(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        this.available = true;
        this.logger.log(`OSRM connected at ${this.baseUrl}`);
        return; // ← thoát sớm
      }
      this.logger.warn(`OSRM /health returned ${res.status}, trying /nearest…`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`OSRM /health failed (${msg}), trying /nearest…`);
    }

    // fallback /nearest
    try {
      const res = await fetch(
        `${this.baseUrl}/nearest/v1/driving/106.6297,10.8231?number=1`,
        { signal: AbortSignal.timeout(3000) },
      );
      const data = (await res.json()) as OsrmNearestResponse;
      if (data.code === 'Ok') {
        this.available = true;
        this.logger.log(`OSRM connected at ${this.baseUrl} (via /nearest)`);
      } else {
        this.logger.error(
          `OSRM /nearest returned code="${data.code}" — fallback về đường chim bay.`,
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `OSRM không khả dụng tại ${this.baseUrl} (${msg}). Fallback về đường chim bay.`,
      );
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  // ─── /route ──────────────────────────────────────────────────────────

  /**
   * Tính khoảng cách & thời gian đường bộ giữa 2 điểm.
   */
  async getRoute(
    from: OsrmCoordinate,
    to: OsrmCoordinate,
  ): Promise<RouteResult | null> {
    if (!this.available) return null;

    try {
      const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
      const url = `${this.baseUrl}/route/v1/driving/${coords}?overview=false`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const data = (await res.json()) as OsrmRouteResponse;

      if (data.code !== 'Ok' || data.routes.length === 0) return null;

      return {
        distanceMeters: data.routes[0].distance,
        durationSeconds: data.routes[0].duration,
      };
    } catch (err) {
      this.logger.warn(`OSRM /route error: ${String(err)}`);
      return null;
    }
  }

  /**
   * Lấy hình dạng (polyline GeoJSON) của 1 lộ trình qua nhiều waypoints.
   *
   * Dùng để vẽ đường đi thật trên bản đồ thay vì đường thẳng.
   *
   * @param waypoints thứ tự ghé thăm, cần ≥ 2 điểm
   * @returns mảng [lng, lat] của từng điểm trên polyline, hoặc null khi OSRM lỗi
   */
  async getRouteGeometry(
    waypoints: readonly OsrmCoordinate[],
  ): Promise<[number, number][] | null> {
    if (!this.available) return null;
    if (waypoints.length < 2) return null;

    try {
      const coords = waypoints.map((c) => `${c.lng},${c.lat}`).join(';');
      const url = `${this.baseUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      const data = (await res.json()) as OsrmRouteResponse;

      if (data.code !== 'Ok' || data.routes.length === 0) return null;

      const geom = data.routes[0].geometry;
      if (!geom || typeof geom === 'string') return null; // không phải GeoJSON

      const geoJson = geom;
      return geoJson.coordinates.map(([lng, lat]) => [lng, lat]);
    } catch (err) {
      this.logger.warn(`OSRM /route (geometry) error: ${String(err)}`);
      return null;
    }
  }

  // ─── /table ──────────────────────────────────────────────────────────

  /**
   * Ma trận khoảng cách/thời gian từ N sources đến M destinations.
   * Hiệu quả hơn gọi N×M lần /route.
   *
   * @returns mảng 2 chiều [sources][destinations], null nếu OSRM lỗi
   */
  async getDistanceMatrix(
    sources: readonly OsrmCoordinate[],
    destinations: readonly OsrmCoordinate[],
  ): Promise<readonly (readonly TableEntry[])[] | null> {
    if (!this.available) return null;
    if (sources.length === 0 || destinations.length === 0) return null;

    try {
      const allCoords = [...sources, ...destinations];
      const coordStr = allCoords.map((c) => `${c.lng},${c.lat}`).join(';');
      const srcIdx = sources.map((_, i) => i).join(';');
      const dstIdx = destinations.map((_, i) => i + sources.length).join(';');

      const url = `${this.baseUrl}/table/v1/driving/${coordStr}?sources=${srcIdx}&destinations=${dstIdx}&annotations=distance,duration`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      const data = (await res.json()) as OsrmTableResponse;

      if (data.code !== 'Ok') return null;

      // Map sang TableEntry[][]
      return data.durations.map((durRow, i) =>
        durRow.map((dur, j) => ({
          durationSeconds: dur,
          distanceMeters: data.distances[i][j],
        })),
      );
    } catch (err) {
      this.logger.warn(`OSRM /table error: ${String(err)}`);
      return null;
    }
  }

  // ─── /nearest ────────────────────────────────────────────────────────

  /**
   * Snap tọa độ vào đường bộ gần nhất.
   */
  async getNearest(point: OsrmCoordinate): Promise<NearestResult | null> {
    if (!this.available) return null;

    try {
      const url = `${this.baseUrl}/nearest/v1/driving/${point.lng},${point.lat}?number=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      const data = (await res.json()) as OsrmNearestResponse;

      if (data.code !== 'Ok' || data.waypoints.length === 0) return null;

      const wp = data.waypoints[0];
      return {
        snappedLng: wp.location[0],
        snappedLat: wp.location[1],
        distanceMeters: wp.distance,
        roadName: wp.name,
      };
    } catch (err) {
      this.logger.warn(`OSRM /nearest error: ${String(err)}`);
      return null;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  /**
   * Haversine fallback — khoảng cách đường chim bay (km).
   */
  static haversineKm(a: OsrmCoordinate, b: OsrmCoordinate): number {
    const R = 6_371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h =
      sinLat * sinLat +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        sinLng *
        sinLng;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
}
