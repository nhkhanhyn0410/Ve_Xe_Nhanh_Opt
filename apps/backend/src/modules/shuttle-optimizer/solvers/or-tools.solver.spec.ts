import { spawn } from 'node:child_process';
import { OrToolsSolver } from './or-tools.solver';
import { TSPTWInstance } from '../models/tsptw-instance';

/**
 * Kiểm tra Python + ortools đã sẵn sàng chưa.
 * Test integration sẽ skip nếu không.
 */
function checkOrToolsAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
    const proc = spawn(pyCmd, ['-c', 'import ortools'], { stdio: 'pipe' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

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

describe('OrToolsSolver', () => {
  let ortoolsAvailable = false;
  const solver = new OrToolsSolver();

  beforeAll(async () => {
    ortoolsAvailable = await checkOrToolsAvailable();
    if (!ortoolsAvailable) {
      console.warn(
        '⚠ ortools chưa cài → integration test sẽ skip. ' +
          'Cài: pip install ortools',
      );
    }
  });

  it('trả empty solution khi N=0', async () => {
    const inst = buildInstance([], []);
    const sol = await solver.solve(inst);
    expect(sol.route).toEqual([]);
    expect(sol.solverName).toBe('or-tools');
  });

  it('thuộc tính cố định: solverName + runtimeMs ≥ 0', async () => {
    const inst = buildInstance([[1, 0]], [[0, 1000]]);
    const sol = await solver.solve(inst);
    expect(sol.solverName).toBe('or-tools');
    expect(sol.runtimeMs).toBeGreaterThanOrEqual(0);
  });

  it('không crash khi Python lệnh không tồn tại — trả empty solution', async () => {
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
    const sol = await solver.solve(inst, {
      pythonCommand: 'python_definitely_does_not_exist_xyz',
    });
    expect(sol.solverName).toBe('or-tools');
    expect(sol.route).toEqual([]);
  });

  // ─── Integration tests — chỉ chạy khi ortools available ────────────

  it('(integration) giải được N=4 hình thoi quanh depot', async () => {
    if (!ortoolsAvailable) {
      console.log('  skipped — ortools chưa cài');
      return;
    }
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
    const sol = await solver.solve(inst, { timeLimitMs: 3000 });
    expect(sol.route).toHaveLength(4);
    expect(new Set(sol.route)).toEqual(new Set([0, 1, 2, 3]));
    // Optimal cho hình thoi tâm depot là 2 + 3√2 ≈ 6.243
    expect(sol.totalDistance).toBeCloseTo(2 + 3 * Math.sqrt(2), 0);
    expect(sol.isFeasible).toBe(true);
  }, 30_000);

  it('(integration) thăm đủ N=6 customer + FEASIBLE với window mở', async () => {
    if (!ortoolsAvailable) {
      console.log('  skipped — ortools chưa cài');
      return;
    }
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
    const sol = await solver.solve(inst, { timeLimitMs: 3000 });
    expect(sol.route).toHaveLength(6);
    expect(new Set(sol.route).size).toBe(6);
    expect(sol.isFeasible).toBe(true);
  }, 30_000);

  it('(integration) báo INFEASIBLE đúng khi time window quá hẹp', async () => {
    if (!ortoolsAvailable) {
      console.log('  skipped — ortools chưa cài');
      return;
    }
    // Customer xa nhưng latest = 0 → arrival luôn > latest → violation
    const inst = buildInstance(
      [
        [10, 0],
        [0, 10],
      ],
      [
        [0, 0],
        [0, 0],
      ],
    );
    const sol = await solver.solve(inst, { timeLimitMs: 3000 });
    expect(sol.violationCount).toBeGreaterThanOrEqual(1);
    expect(sol.isFeasible).toBe(false);
  }, 30_000);
});
