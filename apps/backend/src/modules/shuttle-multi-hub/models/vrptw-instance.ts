import { TimeWindow } from './time-window';

export type MultiHubMode = 'vrptw' | 'mdvrptw';

export interface VrptwDepot {
  id: string;
  name: string;
  coordinates: [number, number];
  timeWindow: TimeWindow;
}

export interface VrptwCustomer {
  id: string;
  name: string;
  coordinates: [number, number];
  serviceTime: number;
  demand: number;
  timeWindow: TimeWindow;
  preferredDepotId?: string;
}

export interface VrptwVehicle {
  id: string;
  name: string;
  startDepotIndex: number;
  endDepotIndex: number;
  capacity: number;
  color: string;
}

export interface VrptwInstance {
  id: string;
  mode: MultiHubMode;
  depots: VrptwDepot[];
  vehicles: VrptwVehicle[];
  customers: VrptwCustomer[];
  distanceMatrix: number[][];
  durationMatrix: number[][];
}

export function customerMatrixIndex(
  instance: VrptwInstance,
  customerIndex: number,
): number {
  return instance.depots.length + customerIndex;
}

export function matrixNodeCoordinates(
  instance: VrptwInstance,
  matrixIndex: number,
): [number, number] {
  if (matrixIndex < instance.depots.length) {
    return instance.depots[matrixIndex].coordinates;
  }
  return instance.customers[matrixIndex - instance.depots.length].coordinates;
}
