import { isLate } from '../models/time-window';
import {
  customerMatrixIndex,
  VrptwInstance,
  VrptwVehicle,
} from '../models/vrptw-instance';
import {
  VehicleRoutePlan,
  VehicleRouteSolution,
  VrptwSolution,
} from '../models/vrptw-solution';

export interface EvaluatedPlan {
  solution: VrptwSolution;
  cost: number;
}

const VIOLATION_PENALTY = 10_000;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function vehicleById(
  instance: VrptwInstance,
  vehicleId: string,
): VrptwVehicle {
  const vehicle = instance.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) {
    throw new Error(`Vehicle '${vehicleId}' does not exist`);
  }
  return vehicle;
}

export class RouteEvaluator {
  evaluatePlan(
    instance: VrptwInstance,
    plans: readonly VehicleRoutePlan[],
    solverName: string,
    runtimeMs: number,
  ): EvaluatedPlan {
    const seen = new Map<number, number>();
    const routes = plans.map((plan) => {
      for (const customerIndex of plan.customerIndices) {
        seen.set(customerIndex, (seen.get(customerIndex) ?? 0) + 1);
      }
      return this.evaluateRoute(instance, vehicleById(instance, plan.vehicleId), plan);
    });

    const unassignedCustomerIds: string[] = [];
    for (let i = 0; i < instance.customers.length; i++) {
      if (!seen.has(i)) {
        unassignedCustomerIds.push(instance.customers[i].id);
      }
    }

    let duplicateCount = 0;
    for (const count of seen.values()) {
      if (count > 1) duplicateCount += count - 1;
    }

    const routeViolations = routes.reduce(
      (sum, route) => sum + route.violationCount,
      0,
    );
    const assignmentViolations = unassignedCustomerIds.length + duplicateCount;
    const violationCount = routeViolations + assignmentViolations;
    const totalDistance = routes.reduce(
      (sum, route) => sum + route.totalDistance,
      0,
    );
    const totalDuration = routes.reduce(
      (sum, route) => sum + route.totalDuration,
      0,
    );

    const solution: VrptwSolution = {
      solverName,
      mode: instance.mode,
      routes: routes.map((route) => ({
        ...route,
        totalDistance: round2(route.totalDistance),
        totalDuration: round1(route.totalDuration),
        depotArrivalTime: round1(route.depotArrivalTime),
        arrivalTimes: route.arrivalTimes.map(round1),
        departureTimes: route.departureTimes.map(round1),
        distanceFromPrev: route.distanceFromPrev.map(round2),
      })),
      unassignedCustomerIds,
      totalDistance: round2(totalDistance),
      totalDuration: round1(totalDuration),
      violationCount,
      isFeasible: violationCount === 0,
      runtimeMs,
    };

    return {
      solution,
      cost: violationCount * VIOLATION_PENALTY + totalDistance,
    };
  }

  private evaluateRoute(
    instance: VrptwInstance,
    vehicle: VrptwVehicle,
    plan: VehicleRoutePlan,
  ): VehicleRouteSolution {
    const startDepot = instance.depots[vehicle.startDepotIndex];
    const endDepot = instance.depots[vehicle.endDepotIndex];
    let currentMatrixIndex = vehicle.startDepotIndex;
    let currentTime = startDepot.timeWindow.earliest;
    let totalDistance = 0;
    let load = 0;
    let violationCount = 0;

    const arrivalTimes: number[] = [];
    const departureTimes: number[] = [];
    const distanceFromPrev: number[] = [];

    for (const customerIndex of plan.customerIndices) {
      const customer = instance.customers[customerIndex];
      const matrixIndex = customerMatrixIndex(instance, customerIndex);
      const travelTime =
        instance.durationMatrix[currentMatrixIndex]?.[matrixIndex] ?? 0;
      const legDistance =
        instance.distanceMatrix[currentMatrixIndex]?.[matrixIndex] ?? 0;
      const arrivalTime = currentTime + travelTime;
      const serviceStart = Math.max(arrivalTime, customer.timeWindow.earliest);
      const departureTime = serviceStart + customer.serviceTime;

      if (isLate(arrivalTime, customer.timeWindow)) {
        violationCount++;
      }

      arrivalTimes.push(arrivalTime);
      departureTimes.push(departureTime);
      distanceFromPrev.push(legDistance);

      totalDistance += legDistance;
      load += customer.demand;
      currentMatrixIndex = matrixIndex;
      currentTime = departureTime;
    }

    const endTravelTime =
      instance.durationMatrix[currentMatrixIndex]?.[vehicle.endDepotIndex] ?? 0;
    const endDistance =
      instance.distanceMatrix[currentMatrixIndex]?.[vehicle.endDepotIndex] ?? 0;
    const depotArrivalTime = currentTime + endTravelTime;
    totalDistance += endDistance;

    if (depotArrivalTime > endDepot.timeWindow.latest) {
      violationCount++;
    }
    if (load > vehicle.capacity) {
      violationCount += load - vehicle.capacity;
    }

    return {
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      startDepotIndex: vehicle.startDepotIndex,
      endDepotIndex: vehicle.endDepotIndex,
      customerIndices: [...plan.customerIndices],
      arrivalTimes,
      departureTimes,
      distanceFromPrev,
      load,
      totalDistance,
      totalDuration: depotArrivalTime - startDepot.timeWindow.earliest,
      depotArrivalTime,
      violationCount,
      isFeasible: violationCount === 0,
    };
  }
}
