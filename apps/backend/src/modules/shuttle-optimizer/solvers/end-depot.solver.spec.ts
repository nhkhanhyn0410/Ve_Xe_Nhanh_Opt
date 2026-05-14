import { AntColonySolver } from './ant-colony.solver';
import { BruteForceSolver } from './brute-force.solver';
import { GreedySolver } from './greedy.solver';
import { SimulatedAnnealingSolver } from './simulated-annealing.solver';
import { TSPTWSolver } from './solver.interface';
import { TwoOptSolver } from './two-opt.solver';
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
  const speedKmh = 25;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const km = Math.abs(coords[i][0] - coords[j][0]);
      distance[i][j] = km;
      duration[i][j] = (km / speedKmh) * 60;
    }
  }

  return { distance, duration };
}

function buildOpenEndInstance(): TSPTWInstance {
  const coords: Array<[number, number]> = [
    [0, 0], // start depot
    [1, 0], // customer
    [10, 0], // end depot
  ];
  const { distance, duration } = buildMatrix(coords);

  return {
    id: 'open-end-test',
    depot: {
      id: 'start',
      name: 'Start Depot',
      coordinates: coords[0],
      serviceTime: 0,
      timeWindow: { earliest: 0, latest: 1000 },
    },
    endDepot: {
      id: 'end',
      name: 'End Depot',
      coordinates: coords[2],
      serviceTime: 0,
      timeWindow: { earliest: 0, latest: 1000 },
    },
    customers: [
      {
        id: 'c1',
        name: 'Customer 1',
        coordinates: coords[1],
        serviceTime: 0,
        timeWindow: { earliest: 0, latest: 1000 },
      },
    ],
    distanceMatrix: distance,
    durationMatrix: duration,
    depotStartTime: 0,
    depotEndTime: 1000,
    vehicleCapacity: 16,
  };
}

describe('open TSPTW end depot', () => {
  const greedy = new GreedySolver();
  const solvers: TSPTWSolver[] = [
    greedy,
    new BruteForceSolver(),
    new TwoOptSolver(greedy),
    new SimulatedAnnealingSolver(greedy),
    new AntColonySolver(greedy, new TwoOptSolver(greedy)),
  ];

  it.each(solvers.map((solver) => [solver.name, solver] as const))(
    '%s tính leg cuối đến endDepot thay vì depot xuất phát',
    async (_name, solver) => {
      const solution = await solver.solve(buildOpenEndInstance(), {
        seed: 42,
      });

      expect(solution.route).toEqual([0]);
      expect(solution.totalDistance).toBeCloseTo(10, 6);
      expect(solution.isFeasible).toBe(true);
    },
  );
});
