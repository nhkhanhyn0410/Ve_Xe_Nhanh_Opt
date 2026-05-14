import { Injectable } from '@nestjs/common';
import { VrptwInstance } from '../models/vrptw-instance';
import { VehicleRoutePlan } from '../models/vrptw-solution';
import { EvaluatedPlan, RouteEvaluator } from './route-evaluator';

export interface TwoOptRefineResult {
  plans: VehicleRoutePlan[];
  evaluation: EvaluatedPlan;
}

@Injectable()
export class TwoOptVrptwSolver {
  readonly name = 'two-opt-vrptw-refiner';

  private readonly evaluator = new RouteEvaluator();

  refine(
    instance: VrptwInstance,
    initialPlans: readonly VehicleRoutePlan[],
    solverName: string,
    timeLimitMs = 250,
  ): TwoOptRefineResult {
    const start = Date.now();
    const plans = clonePlans(initialPlans);
    let best = this.evaluator.evaluatePlan(instance, plans, solverName, 0);
    let improved = true;

    while (improved && Date.now() - start <= timeLimitMs) {
      improved = false;

      for (let routeIndex = 0; routeIndex < plans.length; routeIndex++) {
        const route = plans[routeIndex].customerIndices;
        if (route.length < 2) continue;

        for (let i = 0; i < route.length - 1; i++) {
          for (let j = i + 1; j < route.length; j++) {
            reverseSegment(route, i, j);
            const candidate = this.evaluator.evaluatePlan(
              instance,
              plans,
              solverName,
              0,
            );

            if (candidate.cost + 1e-9 < best.cost) {
              best = candidate;
              improved = true;
              break;
            }

            reverseSegment(route, i, j);
          }
          if (improved || Date.now() - start > timeLimitMs) break;
        }
        if (improved || Date.now() - start > timeLimitMs) break;
      }
    }

    return {
      plans,
      evaluation: best,
    };
  }
}

export function clonePlans(
  plans: readonly VehicleRoutePlan[],
): VehicleRoutePlan[] {
  return plans.map((plan) => ({
    vehicleId: plan.vehicleId,
    customerIndices: [...plan.customerIndices],
  }));
}

function reverseSegment(route: number[], lo: number, hi: number): void {
  while (lo < hi) {
    const tmp = route[lo];
    route[lo] = route[hi];
    route[hi] = tmp;
    lo++;
    hi--;
  }
}
