import { OsrmDistanceMatrixService } from '../../shuttle-optimizer/distance/osrm-distance-matrix.service';
import { MultiHubInstanceGenerator } from '../benchmark/instance-generator';
import { VrptwSolution } from '../models/vrptw-solution';
import { AcoTwoOptMdvrptwSolver } from './aco-two-opt-mdvrptw.solver';
import { AcoTwoOptVrptwSolver } from './aco-two-opt-vrptw.solver';
import { TwoOptVrptwSolver } from './two-opt-vrptw.solver';

function assignedCustomerSet(solution: VrptwSolution): Set<number> {
  const assigned = new Set<number>();
  for (const route of solution.routes) {
    for (const customerIndex of route.customerIndices) {
      assigned.add(customerIndex);
    }
  }
  return assigned;
}

describe('ACO+2Opt multi-hub solvers', () => {
  // Stub OSRM = không khả dụng → service dùng Haversine y như trước.
  const distanceService = new OsrmDistanceMatrixService({
    isAvailable: () => false,
  } as unknown as ConstructorParameters<
    typeof OsrmDistanceMatrixService
  >[0]);
  const generator = new MultiHubInstanceGenerator(distanceService);
  const twoOpt = new TwoOptVrptwSolver();
  const vrptwSolver = new AcoTwoOptVrptwSolver(twoOpt);
  const mdvrptwSolver = new AcoTwoOptMdvrptwSolver(twoOpt);

  it('solves pure VRPTW and assigns every customer exactly once', async () => {
    const instance = await generator.generate({
      mode: 'vrptw',
      customerCount: 8,
      vehicleCount: 2,
      seed: 11,
    });
    const solution = await vrptwSolver.solve(instance, {
      antCount: 4,
      maxIterations: 5,
      seed: 11,
      timeLimitMs: 1000,
      twoOptTimeLimitMs: 20,
    });

    expect(solution.solverName).toBe('aco-2opt-vrptw');
    expect(solution.routes).toHaveLength(2);
    expect(solution.unassignedCustomerIds).toEqual([]);
    expect(assignedCustomerSet(solution).size).toBe(instance.customers.length);
  });

  it('solves MDVRPTW and assigns every customer exactly once', async () => {
    const instance = await generator.generate({
      mode: 'mdvrptw',
      customerCount: 8,
      vehicleCount: 2,
      seed: 12,
    });
    const solution = await mdvrptwSolver.solve(instance, {
      antCount: 4,
      maxIterations: 5,
      seed: 12,
      timeLimitMs: 1000,
      twoOptTimeLimitMs: 20,
    });

    expect(solution.solverName).toBe('aco-2opt-mdvrptw');
    expect(solution.routes).toHaveLength(2);
    expect(solution.unassignedCustomerIds).toEqual([]);
    expect(assignedCustomerSet(solution).size).toBe(instance.customers.length);
  });
});
