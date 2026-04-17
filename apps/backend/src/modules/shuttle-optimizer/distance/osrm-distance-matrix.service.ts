import { Injectable } from '@nestjs/common';

export interface DistanceMatrixResult {
  /** Ma trận distance (km) */
  distances: number[][];
  /** Ma trận duration (phút) */
  durations: number[][];
  /** Nguồn: osrm hoặc haversine (fallback) */
  source: 'osrm' | 'haversine';
}

/**
 * Service lấy ma trận khoảng cách cho N+1 node (1 depot + N customer).
 *
 * Strategy:
 *   1. Thử gọi OSRM /table endpoint → kết quả đường bộ thực tế
 *   2. Nếu OSRM lỗi → fallback về Haversine (đường chim bay × 1.3)
 *
 * Được dùng bởi:
 *   - BenchmarkRunner khi tạo TSPTWInstance từ DB
 *   - InstanceGenerator khi sinh test case random
 *
 * OSRM module đã có sẵn ở `../osrm/osrm.service.ts` — có thể inject và dùng.
 *
 * TODO Week 1 Day 2-3: Implement + integration với OsrmService có sẵn.
 */
@Injectable()
export class OsrmDistanceMatrixService {
  // private readonly logger = new Logger(OsrmDistanceMatrixService.name);

  /**
   * Lấy distance matrix cho danh sách tọa độ.
   * @param coordinates mảng [lng, lat] — index 0 là depot, 1..N là customers
   */
  /**
   * Lấy distance matrix cho danh sách tọa độ.
   * Chiến lược: thử OSRM /table trước → fallback Haversine nếu OSRM lỗi.
   * Hiện tại dùng Haversine luôn (OSRM chưa được implement).
   */
  getMatrix(
    coordinates: Array<[number, number]>,
  ): Promise<DistanceMatrixResult> {
    return Promise.resolve(this.buildHaversineMatrix(coordinates));
  }

  /**
   * Xây dựng distance matrix toàn bộ bằng Haversine.
   * Hệ số road factor 1.35 — trung bình đường bộ dài hơn đường chim bay 35%.
   * Tốc độ đô thị trung bình: 25 km/h (giờ cao điểm sáng TPHCM).
   */
  private buildHaversineMatrix(
    coordinates: Array<[number, number]>,
  ): DistanceMatrixResult {
    const n = coordinates.length;
    const ROAD_FACTOR = 1.35;
    const AVG_SPEED_KMH = 25;

    const distances: number[][] = Array.from({ length: n }, (): number[] =>
      new Array<number>(n).fill(0),
    );
    const durations: number[][] = Array.from({ length: n }, (): number[] =>
      new Array<number>(n).fill(0),
    );

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const km =
          this.haversineKm(coordinates[i], coordinates[j]) * ROAD_FACTOR;
        distances[i][j] = Math.round(km * 100) / 100;
        durations[i][j] = Math.round((km / AVG_SPEED_KMH) * 60 * 10) / 10;
      }
    }

    return { distances, durations, source: 'haversine' };
  }

  /**
   * Haversine formula — khoảng cách great-circle (km) giữa 2 điểm.
   * Dùng làm fallback khi OSRM không khả dụng.
   */
  protected haversineKm(a: [number, number], b: [number, number]): number {
    const R = 6371; // km
    const toRad = (deg: number): number => (deg * Math.PI) / 180;
    const dLat = toRad(b[1] - a[1]);
    const dLng = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]);
    const lat2 = toRad(b[1]);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
}
