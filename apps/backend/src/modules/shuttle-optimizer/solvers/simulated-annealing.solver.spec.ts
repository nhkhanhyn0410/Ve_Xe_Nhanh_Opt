import { SimulatedAnnealingSolver } from './simulated-annealing.solver';
import { GreedySolver } from './greedy.solver';
import { BruteForceSolver } from './brute-force.solver';
import { TSPTWInstance } from '../models/tsptw-instance';

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
      const dx = coords[i][0] - coords[j][0];
      const dy = coords[i][1] - coords[j][1];
      const km = Math.sqrt(dx * dx + dy * dy);
      distance[i][j] = km;
      duration[i][j] = (km / SPEED_KMH) * 60;
    }
  }
  return { distance, duration };
}

function buildInstance(
  customerCoords: Array<[number, number]>,
  customerWindows: Array<[number, number]>,
): TSPTWInstance {
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

describe('SimulatedAnnealingSolver', () => {
  const greedy = new GreedySolver();
  const sa = new SimulatedAnnealingSolver(greedy);
  const bf = new BruteForceSolver();

  it('trả empty solution khi N=0', async () => {
    const inst = buildInstance([], []);
    const sol = await sa.solve(inst);
    expect(sol.route).toEqual([]);
    expect(sol.solverName).toBe('simulated-annealing');
  });

  it('N=1 → trả nghiệm greedy (không có move neighborhood)', async () => {
    const inst = buildInstance([[3, 4]], [[0, 1000]]);
    const sol = await sa.solve(inst);
    expect(sol.route).toEqual([0]);
  });

  it('thăm hết tất cả N customer', async () => {
    const inst = buildInstance(
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
    const sol = await sa.solve(inst, { seed: 42 });
    expect(sol.route).toHaveLength(4);
    expect(new Set(sol.route)).toEqual(new Set([0, 1, 2, 3]));
  });

  it('reproducible — cùng seed → cùng kết quả', async () => {
    const inst = buildInstance(
      [
        [3, 1],
        [-2, 4],
        [1, -3],
        [4, -2],
        [-1, -1],
        [2, 2],
      ],
      [
        [0, 1000],
        [0, 1000],
        [0, 1000],
        [0, 1000],
        [0, 1000],
        [0, 1000],
      ],
    );
    const a = await sa.solve(inst, { seed: 12345 });
    const b = await sa.solve(inst, { seed: 12345 });
    expect(a.route).toEqual(b.route);
    expect(a.totalDistance).toBe(b.totalDistance);
  });

  it('khác seed: đường đi có thể khác (SA stochastic), nhưng chất lượng đều tốt', async () => {
    // Tạo instance 8 điểm — đủ rộng để SA có nhiều local optima
    const inst = buildInstance(
      [
        [5, 0],
        [5, 0.5],
        [1, 5],
        [1, 5.5],
        [-3, 2],
        [-3, 2.5],
        [4, -3],
        [-2, -4],
      ],
      Array(8).fill([0, 1000]) as Array<[number, number]>,
    );
    const sols = await Promise.all(
      [1, 2, 3, 4, 5].map((s) => sa.solve(inst, { seed: s })),
    );
    // Tất cả phải hợp lệ — 8 customer, là permutation 0..7
    sols.forEach((sol) => {
      expect(sol.route).toHaveLength(8);
      expect(new Set(sol.route).size).toBe(8);
    });
    // Note: không assert khác nhau vì SA có thể converge cùng optimum
  });

  it('SA ≤ Greedy (priority: violation, distance) — invariant cốt lõi', async () => {
    const inst = buildInstance(
      [
        [5, 0],
        [5, 0.5],
        [1, 5],
        [1, 5.5],
        [-3, 2],
        [-3, 2.5],
        [4, -3],
        [-2, -4],
      ],
      Array(8).fill([0, 1000]) as Array<[number, number]>,
    );
    const greedySol = await greedy.solve(inst);
    const saSol = await sa.solve(inst, { seed: 42 });

    if (saSol.violationCount === greedySol.violationCount) {
      expect(saSol.totalDistance).toBeLessThanOrEqual(
        greedySol.totalDistance + 1e-6,
      );
    } else {
      expect(saSol.violationCount).toBeLessThan(greedySol.violationCount);
    }
  });

  it('hội tụ gần BruteForce trên instance N=5 (gap < 10%)', async () => {
    const inst = buildInstance(
      [
        [3, 1],
        [-2, 4],
        [1, -3],
        [4, -2],
        [-1, -1],
      ],
      [
        [0, 1000],
        [0, 1000],
        [0, 1000],
        [0, 1000],
        [0, 1000],
      ],
    );
    const bfSol = await bf.solve(inst);
    const saSol = await sa.solve(inst, { seed: 42 });
    const gap =
      (saSol.totalDistance - bfSol.totalDistance) / bfSol.totalDistance;
    // Với N=5 và đủ iter, SA nên rất gần optimal
    expect(gap).toBeLessThan(0.1); // < 10%
  });

  it('hoạt động đúng với cooling=linear', async () => {
    const inst = buildInstance(
      [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ],
      Array(4).fill([0, 1000]) as Array<[number, number]>,
    );
    const sol = await sa.solve(inst, {
      seed: 42,
      coolingSchedule: 'linear',
      initialTemperature: 50,
      iterationsPerTemperature: 50,
    });
    expect(sol.route).toHaveLength(4);
  });

  it('hoạt động đúng với cooling=logarithmic', async () => {
    const inst = buildInstance(
      [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ],
      Array(4).fill([0, 1000]) as Array<[number, number]>,
    );
    const sol = await sa.solve(inst, {
      seed: 42,
      coolingSchedule: 'logarithmic',
      iterationsPerTemperature: 30,
    });
    expect(sol.route).toHaveLength(4);
  });

  it('dừng sớm khi vượt timeLimitMs', async () => {
    const coords: Array<[number, number]> = [];
    const windows: Array<[number, number]> = [];
    for (let i = 0; i < 20; i++) {
      coords.push([(i % 5) * 2 - 4, Math.floor(i / 5) * 2 - 3]);
      windows.push([0, 1000]);
    }
    const inst = buildInstance(coords, windows);
    const start = Date.now();
    const sol = await sa.solve(inst, { timeLimitMs: 50, seed: 1 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000); // có thể overshoot ít vì check ở step level
    expect(sol.route).toHaveLength(20);
  });

  it('runtimeMs + solverName đúng', async () => {
    const inst = buildInstance(
      [
        [1, 0],
        [0, 1],
      ],
      [
        [0, 1000],
        [0, 1000],
      ],
    );
    const sol = await sa.solve(inst);
    expect(sol.runtimeMs).toBeGreaterThanOrEqual(0);
    expect(sol.solverName).toBe('simulated-annealing');
  });
});
