import { BruteForceSolver } from './brute-force.solver';
import { GreedySolver } from './greedy.solver';
import { TSPTWInstance } from '../models/tsptw-instance';

/**
 * Helper: build matrix Euclidean (km) + duration phẳng (đi 25km/h).
 */
function buildMatrix(coords: Array<[number, number]>): {
  distance: number[][];
  duration: number[][];
} {
  const n = coords.length;
  const distance: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(0),
  );
  const duration: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(0),
  );
  const SPEED_KMH = 25;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      // Distance Euclidean — đơn vị "km" giả định mỗi đơn vị tọa độ = 1km cho test
      const dx = coords[i][0] - coords[j][0];
      const dy = coords[i][1] - coords[j][1];
      const km = Math.sqrt(dx * dx + dy * dy);
      distance[i][j] = km;
      duration[i][j] = (km / SPEED_KMH) * 60;
    }
  }
  return { distance, duration };
}

/** Build TSPTWInstance từ tọa độ + time window đơn giản */
function buildInstance(
  customerCoords: Array<[number, number]>,
  customerWindows: Array<[number, number]>,
): TSPTWInstance {
  // Depot là origin (0,0)
  const allCoords: Array<[number, number]> = [[0, 0], ...customerCoords];
  const { distance, duration } = buildMatrix(allCoords);

  return {
    id: 'test',
    depot: {
      id: 'depot',
      name: 'Depot',
      coordinates: [0, 0],
      serviceTime: 0,
      timeWindow: { earliest: 0, latest: 1000 },
    },
    customers: customerCoords.map((c, i) => ({
      id: `c${i + 1}`,
      name: `Customer ${i + 1}`,
      coordinates: c,
      serviceTime: 0,
      timeWindow: {
        earliest: customerWindows[i][0],
        latest: customerWindows[i][1],
      },
    })),
    distanceMatrix: distance,
    durationMatrix: duration,
    depotStartTime: 0,
    depotEndTime: 1000,
    vehicleCapacity: 16,
  };
}

describe('BruteForceSolver', () => {
  const bruteForce = new BruteForceSolver();
  const greedy = new GreedySolver();

  it('trả empty solution khi N=0', async () => {
    const instance = buildInstance([], []);
    const sol = await bruteForce.solve(instance);
    expect(sol.route).toEqual([]);
    expect(sol.totalDistance).toBe(0);
    expect(sol.solverName).toBe('brute-force');
  });

  it('chạy đúng khi N=1', async () => {
    const instance = buildInstance([[3, 4]], [[0, 1000]]);
    const sol = await bruteForce.solve(instance);
    expect(sol.route).toEqual([0]);
    // Khoảng cách: depot(0,0) → c1(3,4) = 5, rồi quay về = 5 → tổng 10
    expect(sol.totalDistance).toBeCloseTo(10, 1);
    expect(sol.violationCount).toBe(0);
    expect(sol.isFeasible).toBe(true);
  });

  it('thăm hết tất cả N customer (route là permutation 0..N-1)', async () => {
    const instance = buildInstance(
      [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ],
      [
        [0, 1000],
        [0, 1000],
        [0, 1000],
        [0, 1000],
      ],
    );
    const sol = await bruteForce.solve(instance);
    expect(sol.route).toHaveLength(4);
    expect(new Set(sol.route)).toEqual(new Set([0, 1, 2, 3]));
  });

  it('tìm thứ tự tối ưu — hình thoi 4 đỉnh quanh depot ở tâm', async () => {
    // Depot (0,0) ở GIỮA hình thoi đỉnh (1,0)(0,1)(-1,0)(0,-1).
    // Tối ưu: depot → đỉnh nào đó (dist 1) → 3 cạnh bên (mỗi cạnh √2) → depot (dist 1)
    //       = 1 + √2 + √2 + √2 + 1 = 2 + 3√2 ≈ 6.243
    // Tệ hơn (đi xuyên qua tâm): dist > 6.243
    const instance = buildInstance(
      [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ],
      [
        [0, 1000],
        [0, 1000],
        [0, 1000],
        [0, 1000],
      ],
    );
    const sol = await bruteForce.solve(instance);
    expect(sol.totalDistance).toBeCloseTo(2 + 3 * Math.sqrt(2), 1);
  });

  it('BF luôn ≤ Greedy về totalDistance (vì BF tối ưu, Greedy tham lam)', async () => {
    // Instance "bẫy" greedy: 2 cụm rời nhau
    //   Cụm A: (5, 0), (5, 0.5)   -- xa depot
    //   Cụm B: (1, 5), (1, 5.5)   -- ở phía khác
    // Greedy có thể đi A → B → A bị lừa, BF tìm A → A → B → B
    const instance = buildInstance(
      [
        [5, 0],
        [5, 0.5],
        [1, 5],
        [1, 5.5],
      ],
      [
        [0, 1000],
        [0, 1000],
        [0, 1000],
        [0, 1000],
      ],
    );
    const bfSol = await bruteForce.solve(instance);
    const greedySol = await greedy.solve(instance);
    expect(bfSol.totalDistance).toBeLessThanOrEqual(
      greedySol.totalDistance + 1e-6,
    );
  });

  it('có violation count đúng khi window quá hẹp', async () => {
    // Customer xa nhưng latest = 0 → chắc chắn vi phạm
    const instance = buildInstance(
      [
        [10, 0],
        [0, 10],
      ],
      [
        [0, 0], // arrival > 0 → late
        [0, 0],
      ],
    );
    const sol = await bruteForce.solve(instance);
    expect(sol.violationCount).toBeGreaterThanOrEqual(1);
    expect(sol.isFeasible).toBe(false);
  });

  it('throw khi N > MAX_N (19)', async () => {
    // tạo 19 customer fake — chỉ cần kiểm tra throw, không cần data thực
    const coords: Array<[number, number]> = [];
    const windows: Array<[number, number]> = [];
    for (let i = 0; i < 19; i++) {
      coords.push([i + 1, 0]);
      windows.push([0, 1000]);
    }
    const instance = buildInstance(coords, windows);
    await expect(bruteForce.solve(instance)).rejects.toThrow(/MAX|N ≤ 18|N=19/);
  });

  it('runtimeMs trả về số ≥ 0', async () => {
    const instance = buildInstance(
      [
        [1, 0],
        [0, 1],
      ],
      [
        [0, 1000],
        [0, 1000],
      ],
    );
    const sol = await bruteForce.solve(instance);
    expect(sol.runtimeMs).toBeGreaterThanOrEqual(0);
  });
});
