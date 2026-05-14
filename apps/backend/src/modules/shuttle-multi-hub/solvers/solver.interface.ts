import { VrptwInstance } from '../models/vrptw-instance';
import { VrptwSolution } from '../models/vrptw-solution';

export interface MultiHubSolverConfig {
  timeLimitMs?: number;
  seed?: number;
  verbose?: boolean;
}

export abstract class MultiHubVrptwSolver {
  abstract readonly name: string;

  abstract solve(
    instance: VrptwInstance,
    config?: MultiHubSolverConfig,
  ): Promise<VrptwSolution>;
}
