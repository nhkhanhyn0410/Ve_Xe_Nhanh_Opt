import {
  MultiHubMode,
  VrptwCustomer,
  VrptwDepot,
  VrptwInstance,
  VrptwVehicle,
} from '../models/vrptw-instance';
import { OsrmDistanceMatrixService } from '../../shuttle-optimizer/distance/osrm-distance-matrix.service';

/**
 * Seed cố định cho VRPTW / MDVRPTW — 10 khách thật ở TPHCM.
 *
 * Đảm bảo TÁI HIỆN ĐƯỢC giữa các lần chạy. Dùng để:
 *   - Debug solver (so sánh log lần A vs lần B trên cùng input)
 *   - Demo ổn định cho người xem (đường đi luôn giống)
 *   - Test boundary: time windows được calibrate để CÓ nghiệm feasible
 *
 * Cấu trúc:
 *   - 2 depot: BXMT (tây) + BXMĐ (đông)
 *   - 2 cụm khách 5 người mỗi cụm, đặt theo cluster gần hub
 *   - VRPTW mode: chỉ dùng depot BXMĐ + 2 xe cùng start/end ở BXMĐ
 *   - MDVRPTW mode: dùng cả 2 depot + 2 xe (1 BXMT, 1 BXMĐ)
 */

export const SEED_HUB_BXMT: [number, number] = [106.6232, 10.7411];
export const SEED_HUB_BXMD: [number, number] = [106.815484, 10.880216];

const DEFAULT_DEPOT_START = 300; // 5:00
const DEFAULT_DEPOT_END = 430; // 7:10

const SEED_CUSTOMERS_RAW: Array<{
  name: string;
  coordinates: [number, number];
  earliest: number;
  latest: number;
  cluster: 'west' | 'east';
}> = [
  // ── Cụm tây (gần BXMT) ───────────────────────────────────────
  {
    name: 'Q.Bình Tân — Aeon Bình Tân',
    coordinates: [106.6075, 10.7458],
    earliest: 315,
    latest: 360,
    cluster: 'west',
  },
  {
    name: 'Q.6 — Phú Lâm',
    coordinates: [106.6322, 10.7474],
    earliest: 320,
    latest: 365,
    cluster: 'west',
  },
  {
    name: 'Q.8 — Cầu Chữ Y',
    coordinates: [106.6644, 10.7411],
    earliest: 325,
    latest: 370,
    cluster: 'west',
  },
  {
    name: 'Q.Bình Chánh — An Lạc',
    coordinates: [106.6098, 10.7311],
    earliest: 310,
    latest: 355,
    cluster: 'west',
  },
  {
    name: 'Q.5 — Chợ Lớn',
    coordinates: [106.6624, 10.7561],
    earliest: 330,
    latest: 380,
    cluster: 'west',
  },
  // ── Cụm đông (gần BXMĐ mới — Thủ Đức) ─────────────────────────
  {
    name: 'TP.Thủ Đức — Vinhomes Grand Park',
    coordinates: [106.829, 10.838],
    earliest: 340,
    latest: 390,
    cluster: 'east',
  },
  {
    name: 'TP.Thủ Đức — Suối Tiên',
    coordinates: [106.8074, 10.8631],
    earliest: 345,
    latest: 395,
    cluster: 'east',
  },
  {
    name: 'TP.Thủ Đức — Đại học Quốc gia',
    coordinates: [106.7993, 10.8732],
    earliest: 350,
    latest: 400,
    cluster: 'east',
  },
  {
    name: 'Q.9 — Lê Văn Việt',
    coordinates: [106.7891, 10.8455],
    earliest: 335,
    latest: 385,
    cluster: 'east',
  },
  {
    name: 'TP.Thủ Đức — Linh Trung',
    coordinates: [106.7641, 10.8694],
    earliest: 355,
    latest: 405,
    cluster: 'east',
  },
];

const VEHICLE_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#ea580c'];

/**
 * Tạo VrptwInstance từ seed cố định.
 *
 * @param mode 'vrptw' (1 depot BXMĐ) hoặc 'mdvrptw' (2 depot)
 * @param distanceService dùng để build matrix Haversine
 */
export async function buildSeedInstance(
  mode: MultiHubMode,
  distanceService: OsrmDistanceMatrixService,
): Promise<VrptwInstance> {
  const depots = buildSeedDepots(mode);
  const vehicles = buildSeedVehicles(mode);
  const customers = buildSeedCustomers(mode);

  const matrix = await distanceService.getMatrix([
    ...depots.map((depot) => depot.coordinates),
    ...customers.map((customer) => customer.coordinates),
  ]);

  return {
    id: `multi-hub-seed-${mode}`,
    mode,
    depots,
    vehicles,
    customers,
    distanceMatrix: matrix.distances,
    durationMatrix: matrix.durations,
  };
}

function buildSeedDepots(mode: MultiHubMode): VrptwDepot[] {
  const bxmd: VrptwDepot = {
    id: 'hub-bxmd',
    name: 'Bến Xe Miền Đông',
    coordinates: SEED_HUB_BXMD,
    timeWindow: { earliest: DEFAULT_DEPOT_START, latest: DEFAULT_DEPOT_END },
  };

  if (mode === 'vrptw') {
    return [bxmd];
  }

  return [
    {
      id: 'hub-bxmt',
      name: 'Bến Xe Miền Tây',
      coordinates: SEED_HUB_BXMT,
      timeWindow: { earliest: DEFAULT_DEPOT_START, latest: DEFAULT_DEPOT_END },
    },
    bxmd,
  ];
}

function buildSeedVehicles(mode: MultiHubMode): VrptwVehicle[] {
  // VRPTW: 2 xe đều start/end ở BXMĐ (depot index 0 vì chỉ có 1 depot).
  // MDVRPTW: xe 1 ở BXMT (idx 0), xe 2 ở BXMĐ (idx 1).
  if (mode === 'vrptw') {
    return [
      {
        id: 'vehicle-1',
        name: 'Shuttle 1 (BXMĐ)',
        startDepotIndex: 0,
        endDepotIndex: 0,
        capacity: 6,
        color: VEHICLE_COLORS[0],
      },
      {
        id: 'vehicle-2',
        name: 'Shuttle 2 (BXMĐ)',
        startDepotIndex: 0,
        endDepotIndex: 0,
        capacity: 6,
        color: VEHICLE_COLORS[1],
      },
    ];
  }

  return [
    {
      id: 'vehicle-1',
      name: 'Shuttle 1 (BXMT)',
      startDepotIndex: 0,
      endDepotIndex: 0,
      capacity: 6,
      color: VEHICLE_COLORS[0],
    },
    {
      id: 'vehicle-2',
      name: 'Shuttle 2 (BXMĐ)',
      startDepotIndex: 1,
      endDepotIndex: 1,
      capacity: 6,
      color: VEHICLE_COLORS[1],
    },
  ];
}

function buildSeedCustomers(mode: MultiHubMode): VrptwCustomer[] {
  return SEED_CUSTOMERS_RAW.map((raw, idx) => {
    const preferredDepotId =
      mode === 'mdvrptw' ? (raw.cluster === 'west' ? 'hub-bxmt' : 'hub-bxmd') : 'hub-bxmd';

    return {
      id: `seed-c${idx + 1}`,
      name: raw.name,
      coordinates: raw.coordinates,
      serviceTime: 2,
      demand: 1,
      timeWindow: { earliest: raw.earliest, latest: raw.latest },
      preferredDepotId,
    };
  });
}
