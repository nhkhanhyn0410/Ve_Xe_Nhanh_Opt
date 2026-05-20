import { Injectable, Logger } from '@nestjs/common';
import { SeededRandom } from '../../shuttle-optimizer/models/seeded-random';
import { waitTime } from '../models/time-window';
import {
  customerMatrixIndex,
  MultiHubMode,
  VrptwInstance,
  VrptwVehicle,
} from '../models/vrptw-instance';
import {
  VehicleRoutePlan,
  VrptwSolution,
  emptySolution,
} from '../models/vrptw-solution';
import { EvaluatedPlan, RouteEvaluator } from './route-evaluator';
import {
  clonePlans,
  TwoOptRefineResult,
  TwoOptVrptwSolver,
} from './two-opt-vrptw.solver';
import {
  MultiHubSolverConfig,
  MultiHubVrptwSolver,
} from './solver.interface';

export interface AcoTwoOptConfig extends MultiHubSolverConfig {
  antCount?: number;
  maxIterations?: number;
  alpha?: number;
  beta?: number;
  evaporationRate?: number;
  pheromoneDeposit?: number;
  useLocalSearch?: boolean;
  twoOptTimeLimitMs?: number;
}

interface ConstructionState {
  vehicle: VrptwVehicle;
  plan: VehicleRoutePlan;
  currentMatrixIndex: number;
  currentTime: number;
  load: number;
}

interface CandidateChoice {
  stateIndex: number;
  customerIndex: number;
  weight: number;
  score: number;
}

export abstract class BaseAcoTwoOptSolver extends MultiHubVrptwSolver {
  protected abstract readonly expectedMode: MultiHubMode;

  private readonly evaluator = new RouteEvaluator();
  private readonly logger = new Logger(BaseAcoTwoOptSolver.name);

  private static readonly DEFAULT_TIME_LIMIT_MS = 8_000;
  private static readonly EPSILON = 1e-6;

  constructor(private readonly twoOpt: TwoOptVrptwSolver) {
    super();
  }

  async solve(
    instance: VrptwInstance,
    config?: AcoTwoOptConfig,
  ): Promise<VrptwSolution> {
    const start = Date.now();
    if (instance.mode !== this.expectedMode) {
      throw new Error(
        `${this.name} expects mode='${this.expectedMode}' but got '${instance.mode}'`,
      );
    }
    if (instance.customers.length === 0) {
      return emptySolution(this.name, instance.mode);
    }

    const n = instance.customers.length;
    const antCount = config?.antCount ?? Math.max(12, n);
    const maxIterations = config?.maxIterations ?? 80;
    const alpha = config?.alpha ?? 1.0;
    const beta = config?.beta ?? 3.0;
    const evaporationRate = config?.evaporationRate ?? 0.12;
    const pheromoneDeposit = config?.pheromoneDeposit ?? 100;
    const useLocalSearch = config?.useLocalSearch ?? true;
    const timeLimitMs =
      config?.timeLimitMs ?? BaseAcoTwoOptSolver.DEFAULT_TIME_LIMIT_MS;
    const twoOptTimeLimitMs = config?.twoOptTimeLimitMs ?? 180;
    const rng = new SeededRandom(config?.seed ?? Date.now());

    const greedyPlans = this.buildGreedyPlans(instance);
    const initial = this.refineOrEvaluate(
      instance,
      greedyPlans,
      useLocalSearch,
      twoOptTimeLimitMs,
    );
    let bestPlans = clonePlans(initial.plans);
    let bestEval = initial.evaluation;

    const matrixSize = instance.distanceMatrix.length;
    const tau0 = 1 / Math.max(1, n * bestEval.cost);
    const tau = this.makeMatrix(matrixSize, tau0);
    const eta = this.computeHeuristic(instance);

    let iter = 0;
    let lastImprovementIter = 0;
    while (iter < maxIterations && Date.now() - start <= timeLimitMs) {
      iter++;
      const ants: Array<{ plans: VehicleRoutePlan[]; evaluation: EvaluatedPlan }> =
        [];

      for (let ant = 0; ant < antCount; ant++) {
        const plans = this.constructPlan(instance, tau, eta, alpha, beta, rng);
        ants.push(
          this.refineOrEvaluate(
            instance,
            plans,
            useLocalSearch,
            twoOptTimeLimitMs,
          ),
        );
      }

      ants.sort((a, b) => a.evaluation.cost - b.evaluation.cost);
      if (ants[0].evaluation.cost + 1e-9 < bestEval.cost) {
        bestEval = ants[0].evaluation;
        bestPlans = clonePlans(ants[0].plans);
        lastImprovementIter = iter;
      }

      this.evaporate(tau, evaporationRate);
      this.deposit(
        tau,
        bestPlans,
        instance,
        pheromoneDeposit / Math.max(1, bestEval.cost),
      );
    }

    if (config?.verbose) {
      this.logger.log(
        `${this.name}: iter=${iter}, lastImprovement=${lastImprovementIter}, cost=${bestEval.cost.toFixed(2)}`,
      );
    }

    return this.evaluator.evaluatePlan(
      instance,
      bestPlans,
      this.name,
      Date.now() - start,
    ).solution;
  }

  private refineOrEvaluate(
    instance: VrptwInstance,
    plans: readonly VehicleRoutePlan[],
    useLocalSearch: boolean,
    twoOptTimeLimitMs: number,
  ): TwoOptRefineResult {
    if (useLocalSearch) {
      return this.twoOpt.refine(instance, plans, this.name, twoOptTimeLimitMs);
    }
    return {
      plans: clonePlans(plans),
      evaluation: this.evaluator.evaluatePlan(instance, plans, this.name, 0),
    };
  }

  private buildGreedyPlans(instance: VrptwInstance): VehicleRoutePlan[] {
    const states = this.initialStates(instance);
    const unvisited = new Set<number>(
      instance.customers.map((_customer, index) => index),
    );

    while (unvisited.size > 0) {
      const choices = this.candidateChoices(
        instance,
        states,
        unvisited,
        1,
        1,
        undefined,
        undefined,
      );
      choices.sort((a, b) => a.score - b.score);
      const chosen = choices[0];
      this.applyChoice(instance, states[chosen.stateIndex], chosen.customerIndex);
      unvisited.delete(chosen.customerIndex);
    }

    return states.map((state) => state.plan);
  }

  private constructPlan(
    instance: VrptwInstance,
    tau: number[][],
    eta: number[][],
    alpha: number,
    beta: number,
    rng: SeededRandom,
  ): VehicleRoutePlan[] {
    const states = this.initialStates(instance);
    const unvisited = new Set<number>(
      instance.customers.map((_customer, index) => index),
    );

    while (unvisited.size > 0) {
      const choices = this.candidateChoices(
        instance,
        states,
        unvisited,
        alpha,
        beta,
        tau,
        eta,
      );
      const chosen = this.pickCandidate(choices, rng);
      this.applyChoice(instance, states[chosen.stateIndex], chosen.customerIndex);
      unvisited.delete(chosen.customerIndex);
    }

    return states.map((state) => state.plan);
  }

  private initialStates(instance: VrptwInstance): ConstructionState[] {
    return instance.vehicles.map((vehicle) => ({
      vehicle,
      plan: {
        vehicleId: vehicle.id,
        customerIndices: [],
      },
      currentMatrixIndex: vehicle.startDepotIndex,
      currentTime: instance.depots[vehicle.startDepotIndex].timeWindow.earliest,
      load: 0,
    }));
  }

  private candidateChoices(
    instance: VrptwInstance,
    states: readonly ConstructionState[],
    unvisited: ReadonlySet<number>,
    alpha: number,
    beta: number,
    tau?: number[][],
    eta?: number[][],
  ): CandidateChoice[] {
    const choices: CandidateChoice[] = [];
    let hasCapacityFeasibleChoice = false;

    for (let stateIndex = 0; stateIndex < states.length; stateIndex++) {
      const state = states[stateIndex];
      for (const customerIndex of unvisited) {
        const customer = instance.customers[customerIndex];
        if (state.load + customer.demand <= state.vehicle.capacity) {
          hasCapacityFeasibleChoice = true;
        }
      }
    }

    for (let stateIndex = 0; stateIndex < states.length; stateIndex++) {
      const state = states[stateIndex];
      for (const customerIndex of unvisited) {
        const customer = instance.customers[customerIndex];
        const capacityOk = state.load + customer.demand <= state.vehicle.capacity;
        if (hasCapacityFeasibleChoice && !capacityOk) continue;

        const customerMatrix = customerMatrixIndex(instance, customerIndex);
        const travelTime =
          instance.durationMatrix[state.currentMatrixIndex][customerMatrix];
        const arrivalTime = state.currentTime + travelTime;
        const wait = waitTime(arrivalTime, customer.timeWindow);
        const latePenalty = Math.max(0, arrivalTime - customer.timeWindow.latest);
        const departureTime =
          Math.max(arrivalTime, customer.timeWindow.earliest) +
          customer.serviceTime;
        const endTravel =
          instance.durationMatrix[customerMatrix][state.vehicle.endDepotIndex];
        const endDepot = instance.depots[state.vehicle.endDepotIndex];
        const returnLatePenalty = Math.max(
          0,
          departureTime + endTravel - endDepot.timeWindow.latest,
        );
        const overloadPenalty = Math.max(
          0,
          state.load + customer.demand - state.vehicle.capacity,
        );
        const preferencePenalty =
          customer.preferredDepotId &&
          customer.preferredDepotId !==
            instance.depots[state.vehicle.startDepotIndex].id
            ? 12
            : 0;
        const score =
          travelTime +
          wait +
          latePenalty * 80 +
          returnLatePenalty * 25 +
          overloadPenalty * 500 +
          preferencePenalty;

        if (!tau || !eta) {
          choices.push({
            stateIndex,
            customerIndex,
            weight: 1 / Math.max(BaseAcoTwoOptSolver.EPSILON, score),
            score,
          });
          continue;
        }

        const pheromone = Math.pow(
          tau[state.currentMatrixIndex][customerMatrix],
          alpha,
        );
        const heuristic = Math.pow(
          eta[state.currentMatrixIndex][customerMatrix],
          beta,
        );
        const timeBias = 1 / (1 + wait + latePenalty * 30 + returnLatePenalty);
        const depotBias =
          customer.preferredDepotId ===
          instance.depots[state.vehicle.startDepotIndex].id
            ? 1.7
            : customer.preferredDepotId
              ? 0.75
              : 1;
        const capacityBias = capacityOk ? 1 : 0.03;
        choices.push({
          stateIndex,
          customerIndex,
          weight: Math.max(
            BaseAcoTwoOptSolver.EPSILON,
            pheromone * heuristic * timeBias * depotBias * capacityBias,
          ),
          score,
        });
      }
    }

    return choices;
  }

  private pickCandidate(
    choices: readonly CandidateChoice[],
    rng: SeededRandom,
  ): CandidateChoice {
    if (choices.length === 0) {
      throw new Error('No candidate choices available while constructing VRPTW');
    }
    const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
    if (totalWeight <= 0) {
      return choices[rng.randInt(0, choices.length - 1)];
    }

    const threshold = rng.next() * totalWeight;
    let acc = 0;
    for (const choice of choices) {
      acc += choice.weight;
      if (acc >= threshold) return choice;
    }
    return choices[choices.length - 1];
  }

  private applyChoice(
    instance: VrptwInstance,
    state: ConstructionState,
    customerIndex: number,
  ): void {
    const customer = instance.customers[customerIndex];
    const matrixIndex = customerMatrixIndex(instance, customerIndex);
    const arrivalTime =
      state.currentTime +
      instance.durationMatrix[state.currentMatrixIndex][matrixIndex];

    state.plan.customerIndices.push(customerIndex);
    state.currentTime =
      Math.max(arrivalTime, customer.timeWindow.earliest) + customer.serviceTime;
    state.currentMatrixIndex = matrixIndex;
    state.load += customer.demand;
  }

  private makeMatrix(size: number, value: number): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < size; i++) {
      matrix.push(new Array<number>(size).fill(value));
    }
    return matrix;
  }

  private computeHeuristic(instance: VrptwInstance): number[][] {
    const size = instance.distanceMatrix.length;
    const eta = this.makeMatrix(size, 0);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i !== j) {
          eta[i][j] =
            1 / (instance.distanceMatrix[i][j] + BaseAcoTwoOptSolver.EPSILON);
        }
      }
    }
    return eta;
  }

  private evaporate(tau: number[][], evaporationRate: number): void {
    for (let i = 0; i < tau.length; i++) {
      for (let j = 0; j < tau[i].length; j++) {
        tau[i][j] *= 1 - evaporationRate;
        if (tau[i][j] < BaseAcoTwoOptSolver.EPSILON) {
          tau[i][j] = BaseAcoTwoOptSolver.EPSILON;
        }
      }
    }
  }

  private deposit(
    tau: number[][],
    plans: readonly VehicleRoutePlan[],
    instance: VrptwInstance,
    amount: number,
  ): void {
    for (const plan of plans) {
      const vehicle = instance.vehicles.find((v) => v.id === plan.vehicleId);
      if (!vehicle || plan.customerIndices.length === 0) continue;

      let previousMatrix = vehicle.startDepotIndex;
      for (const customerIndex of plan.customerIndices) {
        const currentMatrix = customerMatrixIndex(instance, customerIndex);
        tau[previousMatrix][currentMatrix] += amount;
        tau[currentMatrix][previousMatrix] += amount;
        previousMatrix = currentMatrix;
      }
      tau[previousMatrix][vehicle.endDepotIndex] += amount;
      tau[vehicle.endDepotIndex][previousMatrix] += amount;
    }
  }
}

@Injectable()
export class AcoTwoOptVrptwSolver extends BaseAcoTwoOptSolver {
  readonly name = 'aco-2opt-vrptw';
  protected readonly expectedMode = 'vrptw' as const;

  constructor(twoOpt: TwoOptVrptwSolver) {
    super(twoOpt);
  }
}
