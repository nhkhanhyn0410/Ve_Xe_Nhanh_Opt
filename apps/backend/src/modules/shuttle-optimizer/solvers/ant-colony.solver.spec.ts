import { AntColonySolver } from './ant-colony.solver';
import { GreedySolver } from './greedy.solver';
import { TwoOptSolver } from './two-opt.solver';
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

describe('AntColonySolver', () => {
  const greedy = new GreedySolver();
  const twoOpt = new TwoOptSolver(greedy);
  const aco = new AntColonySolver(greedy, twoOpt);
  const bf = new BruteForceSolver();

  it('trả empty solution khi N=0', async () => {
    const inst = buildInstance([], []);
    const sol = await aco.solve(inst);
    expect(sol.route).toEqual([]);
    expect(sol.solverName).toBe('aco-2opt-hybrid');
  });

  it('N=1 → trả greedy (không có lựa chọn)', async () => {
    const inst = buildInstance([[3, 4]], [[0, 1000]]);
    const sol = await aco.solve(inst, { seed: 42 });
    expect(sol.route).toEqual([0]);
  });

  it('thăm hết tất cả N customer (route là permutation)', async () => {
    const inst = buildInstance(
      [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ],
      Array(4).fill([0, 1000]) as Array<[number, number]>,
    );
    const sol = await aco.solve(inst, { seed: 42, maxIterations: 20 });
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
      Array(6).fill([0, 1000]) as Array<[number, number]>,
    );
    const a = await aco.solve(inst, { seed: 12345, maxIterations: 20 });
    const b = await aco.solve(inst, { seed: 12345, maxIterations: 20 });
    expect(a.route).toEqual(b.route);
    expect(a.totalDistance).toBe(b.totalDistance);
  });

  it('ACO ≤ Greedy theo lex order (invariant cốt lõi)', async () => {
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
    const acoSol = await aco.solve(inst, { seed: 42, maxIterations: 30 });

    if (acoSol.violationCount === greedySol.violationCount) {
      expect(acoSol.totalDistance).toBeLessThanOrEqual(
        greedySol.totalDistance + 1e-6,
      );
    } else {
      expect(acoSol.violationCount).toBeLessThan(greedySol.violationCount);
    }
  });

  it('ACO match BruteForce trên N=5 (gap < 5%)', async () => {
    const inst = buildInstance(
      [
        [3, 1],
        [-2, 4],
        [1, -3],
        [4, -2],
        [-1, -1],
      ],
      Array(5).fill([0, 1000]) as Array<[number, number]>,
    );
    const bfSol = await bf.solve(inst);
    const acoSol = await aco.solve(inst, { seed: 42, maxIterations: 50 });
    const gap =
      (acoSol.totalDistance - bfSol.totalDistance) / bfSol.totalDistance;
    expect(gap).toBeLessThan(0.05);
  });

  it('variant=AS chạy được', async () => {
    const inst = buildInstance(
      [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ],
      Array(4).fill([0, 1000]) as Array<[number, number]>,
    );
    const sol = await aco.solve(inst, {
      seed: 42,
      maxIterations: 20,
      variant: 'AS',
    });
    expect(sol.route).toHaveLength(4);
  });

  it('useLocalSearch=false vẫn chạy được (pure ACO)', async () => {
    const inst = buildInstance(
      [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ],
      Array(4).fill([0, 1000]) as Array<[number, number]>,
    );
    const sol = await aco.solve(inst, {
      seed: 42,
      maxIterations: 20,
      useLocalSearch: false,
    });
    expect(sol.route).toHaveLength(4);
  });

  it('hybrid 2-opt cải thiện so với pure ACO trên cùng instance + seed', async () => {
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
    const pureACO = await aco.solve(inst, {
      seed: 42,
      maxIterations: 30,
      useLocalSearch: false,
    });
    const hybridACO = await aco.solve(inst, {
      seed: 42,
      maxIterations: 30,
      useLocalSearch: true,
    });
    // Hybrid không thể tệ hơn (lex order)
    if (hybridACO.violationCount === pureACO.violationCount) {
      expect(hybridACO.totalDistance).toBeLessThanOrEqual(
        pureACO.totalDistance + 1e-6,
      );
    } else {
      expect(hybridACO.violationCount).toBeLessThanOrEqual(
        pureACO.violationCount,
      );
    }
  });

  it('dừng sớm khi vượt timeLimitMs', async () => {
    const coords: Array<[number, number]> = [];
    for (let i = 0; i < 15; i++)
      coords.push([(i % 5) - 2, Math.floor(i / 5) - 1]);
    const inst = buildInstance(
      coords,
      coords.map(() => [0, 1000] as [number, number]),
    );
    const startMs = Date.now();
    const sol = await aco.solve(inst, {
      seed: 1,
      maxIterations: 1000,
      timeLimitMs: 100,
    });
    const elapsed = Date.now() - startMs;
    expect(elapsed).toBeLessThan(5000); // có thể overshoot 1 iter
    expect(sol.route).toHaveLength(15);
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
    const sol = await aco.solve(inst, { seed: 42, maxIterations: 5 });
    expect(sol.runtimeMs).toBeGreaterThanOrEqual(0);
    expect(sol.solverName).toBe('aco-2opt-hybrid');
  });
});
