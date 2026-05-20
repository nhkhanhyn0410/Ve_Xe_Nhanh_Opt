import { Injectable } from '@nestjs/common';
import { TSPTWInstance, TSPTWNode } from '../models/tsptw-instance';
import { SeededRandom } from '../models/seeded-random';
import { OsrmDistanceMatrixService } from '../distance/osrm-distance-matrix.service';

/**
 * Cấu hình sinh instance ngẫu nhiên.
 */
export interface GenerateConfig {
  /** Số customer (1..30 cho hợp lý) */
  customerCount: number;
  /** Bán kính phân bố customer quanh depot (km). Mặc định 8 (nới vừa — đủ slack di chuyển). */
  radiusKm?: number;
  /** Tâm depot [lng, lat]. Mặc định Bến Xe Miền Đông TPHCM. */
  depotCenter?: [number, number];
  /** Tên depot (chỉ dùng để hiển thị). */
  depotName?: string;
  /** Tâm depot kết thúc [lng, lat]. Để trống nếu quay về depot xuất phát. */
  endDepotCenter?: [number, number];
  /** Tên depot kết thúc (chỉ dùng để hiển thị). */
  endDepotName?: string;
  /** Window width trung bình (phút). Càng nhỏ càng khó. Mặc định 60. */
  windowWidthMinutes?: number;
  /** Phút từ 00:00 — shuttle xuất phát. Mặc định 300 (5:00). */
  depotStartTime?: number;
  /** Phút từ 00:00 — hạn về depot. Mặc định 600 (10:00) — cửa sổ 300' để có case feasible. */
  depotEndTime?: number;
  /** Service time mỗi customer (phút). Mặc định 2. */
  serviceTime?: number;
  /** Sức chứa xe shuttle. Mặc định 16. */
  vehicleCapacity?: number;
  /** Random seed để reproducible. Mặc định Date.now(). */
  seed?: number;
}

/**
 * Default depot — Bến Xe Miền Đông, TPHCM.
 */
const DEFAULT_DEPOT_CENTER: [number, number] = [106.815484, 10.880216];

/**
 * Xấp xỉ km/độ — đủ cho bán kính nhỏ (< 50km) trong vùng nhiệt đới.
 *   1° latitude  ≈ 110.574 km
 *   1° longitude ≈ 111.320 × cos(lat) km
 */
const KM_PER_DEGREE_LAT = 110.574;

/**
 * Sinh 1 điểm ngẫu nhiên đều phân bố trong đĩa bán kính `radiusKm` quanh `center`.
 * Dùng phép biến đổi r = R·√U, θ = 2π·V để đảm bảo phân bố đều theo diện tích
 * (KHÔNG phải uniform 2 chiều, sẽ bị tụ tâm).
 */
function pointInDisk(
  rng: SeededRandom,
  center: [number, number],
  radiusKm: number,
): [number, number] {
  const r = radiusKm * Math.sqrt(rng.next());
  const theta = 2 * Math.PI * rng.next();
  const dxKm = r * Math.cos(theta);
  const dyKm = r * Math.sin(theta);

  const lat = center[1];
  const dLat = dyKm / KM_PER_DEGREE_LAT;
  const dLng = dxKm / (KM_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));

  return [center[0] + dLng, center[1] + dLat];
}

/**
 * InstanceGenerator — sinh TSPTWInstance ngẫu nhiên cho benchmark.
 *
 * Đặc điểm:
 *   - Customer phân bố đều trong đĩa bán kính `radiusKm` quanh depot
 *   - Time window: center random trong [depotStart+15, depotEnd-15],
 *     half-width = windowWidthMinutes/2 × Uniform(0.7, 1.3) để có biến thiên
 *   - Distance matrix dùng `OsrmDistanceMatrixService` (Haversine fallback ổn định)
 *   - Reproducible: cùng seed → cùng instance
 *
 * Khuyến nghị size cho benchmark báo cáo:
 *   - N = 5, 8, 10:  brute-force còn chạy được → có optimality gap
 *   - N = 12, 15:    greedy + 2-opt + SA, BF 1-30s
 *   - N = 20, 30:    chỉ heuristic — đo runtime + relative gap
 *
 * Mỗi size nên sinh 10-30 instance (đa dạng seed) để có ý nghĩa thống kê.
 */
@Injectable()
export class InstanceGenerator {
  constructor(private readonly distanceService: OsrmDistanceMatrixService) {}

  async generate(config: GenerateConfig): Promise<TSPTWInstance> {
    const {
      customerCount,
      radiusKm = 8,
      depotCenter = DEFAULT_DEPOT_CENTER,
      depotName = 'Random Depot',
      endDepotCenter,
      endDepotName = 'End Depot',
      windowWidthMinutes = 60,
      depotStartTime = 300,
      depotEndTime = 600,
      serviceTime = 2,
      vehicleCapacity = 16,
      seed = Date.now(),
    } = config;

    if (customerCount < 1) {
      throw new Error(`customerCount phải ≥ 1 (nhận ${customerCount})`);
    }
    if (customerCount > 30) {
      throw new Error(
        `customerCount > 30 không khuyến nghị cho benchmark (nhận ${customerCount}). ` +
          `Nếu cần size lớn, comment ngưỡng này.`,
      );
    }
    if (depotEndTime - depotStartTime < windowWidthMinutes + 30) {
      throw new Error(
        `Khung depot [${depotStartTime}, ${depotEndTime}] quá hẹp so với ` +
          `windowWidthMinutes=${windowWidthMinutes}. Nới depotEndTime hoặc giảm windowWidth.`,
      );
    }

    const rng = new SeededRandom(seed);

    // 1) Sinh tọa độ customer
    const customerCoords: Array<[number, number]> = [];
    for (let i = 0; i < customerCount; i++) {
      customerCoords.push(pointInDisk(rng, depotCenter, radiusKm));
    }

    // 2) Build distance + duration matrix
    const allCoords: Array<[number, number]> = [
      depotCenter,
      ...customerCoords,
      ...(endDepotCenter ? [endDepotCenter] : []),
    ];
    const matrix = await this.distanceService.getMatrix(allCoords);

    // 3) Sinh time window cho từng customer
    //    Window center uniform trong [depotStart + 15, depotEnd - 15] để chắc
    //    còn khoảng đệm cho travel + return.
    //    Half-width xáo theo Uniform(0.7, 1.3) × windowWidthMinutes/2 → có
    //    instance dễ + khó xen kẽ.
    const customers: TSPTWNode[] = customerCoords.map((coords, i) => {
      const windowCenter = rng.uniform(depotStartTime + 15, depotEndTime - 15);
      const halfWidth = (windowWidthMinutes / 2) * rng.uniform(0.7, 1.3);
      const earliest = Math.max(
        depotStartTime,
        Math.floor(windowCenter - halfWidth),
      );
      const latest = Math.min(
        depotEndTime,
        Math.ceil(windowCenter + halfWidth),
      );

      return {
        id: `gen-c${i + 1}`,
        name: `Customer ${i + 1}`,
        coordinates: coords,
        serviceTime,
        timeWindow: { earliest, latest },
      };
    });

    return {
      id: `gen-N${customerCount}-r${radiusKm}-w${windowWidthMinutes}-s${seed}`,
      depot: {
        id: 'gen-depot',
        name: depotName,
        coordinates: depotCenter,
        serviceTime: 0,
        timeWindow: { earliest: depotStartTime, latest: depotEndTime },
      },
      endDepot: endDepotCenter
        ? {
            id: 'gen-end-depot',
            name: endDepotName,
            coordinates: endDepotCenter,
            serviceTime: 0,
            timeWindow: { earliest: depotStartTime, latest: depotEndTime },
          }
        : undefined,
      customers,
      distanceMatrix: matrix.distances,
      durationMatrix: matrix.durations,
      depotStartTime,
      depotEndTime,
      vehicleCapacity,
    };
  }
}
