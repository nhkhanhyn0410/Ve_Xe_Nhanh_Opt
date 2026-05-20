import { MultiHubMode } from './vrptw-instance';

export interface VehicleRoutePlan {
  vehicleId: string;
  customerIndices: number[];
}

export interface VehicleRouteSolution {
  vehicleId: string;
  vehicleName: string;
  startDepotIndex: number;
  endDepotIndex: number;
  customerIndices: number[];
  arrivalTimes: number[];
  departureTimes: number[];
  distanceFromPrev: number[];
  load: number;
  totalDistance: number;
  totalDuration: number;
  depotArrivalTime: number;
  violationCount: number;
  isFeasible: boolean;
}

export interface VrptwSolution {
  solverName: string;
  mode: MultiHubMode;
  routes: VehicleRouteSolution[];
  unassignedCustomerIds: string[];
  totalDistance: number;
  totalDuration: number;
  violationCount: number;
  isFeasible: boolean;
  runtimeMs: number;
}

export function emptySolution(
  solverName: string,
  mode: MultiHubMode,
): VrptwSolution {
  return {
    solverName,
    mode,
    routes: [],
    unassignedCustomerIds: [],
    totalDistance: 0,
    totalDuration: 0,
    violationCount: 0,
    isFeasible: true,
    runtimeMs: 0,
  };
}
