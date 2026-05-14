import { Injectable } from '@nestjs/common';
import { OsrmDistanceMatrixService } from '../../shuttle-optimizer/distance/osrm-distance-matrix.service';
import { SeededRandom } from '../../shuttle-optimizer/models/seeded-random';
import {
  MultiHubMode,
  VrptwCustomer,
  VrptwDepot,
  VrptwInstance,
  VrptwVehicle,
} from '../models/vrptw-instance';

export interface MultiHubGenerateConfig {
  mode?: MultiHubMode;
  customerCount?: number;
  vehicleCount?: number;
  radiusKm?: number;
  windowWidthMinutes?: number;
  depotStartTime?: number;
  depotEndTime?: number;
  serviceTime?: number;
  vehicleCapacity?: number;
  seed?: number;
}

export const HUB_BXMT: [number, number] = [106.6232, 10.7411];
export const HUB_BXMD: [number, number] = [106.815484, 10.880216];

const KM_PER_DEGREE_LAT = 110.574;
const VEHICLE_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#ea580c'];

function pointInDisk(
  rng: SeededRandom,
  center: [number, number],
  radiusKm: number,
): [number, number] {
  const r = radiusKm * Math.sqrt(rng.next());
  const theta = 2 * Math.PI * rng.next();
  const dxKm = r * Math.cos(theta);
  const dyKm = r * Math.sin(theta);
  const lat = center[1];
  const dLat = dyKm / KM_PER_DEGREE_LAT;
  const dLng = dxKm / (KM_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));
  return [center[0] + dLng, center[1] + dLat];
}

@Injectable()
export class MultiHubInstanceGenerator {
  constructor(private readonly distanceService: OsrmDistanceMatrixService) {}

  async generate(config: MultiHubGenerateConfig = {}): Promise<VrptwInstance> {
    const mode = config.mode ?? 'mdvrptw';
    const customerCount = config.customerCount ?? 14;
    const vehicleCount = config.vehicleCount ?? (mode === 'mdvrptw' ? 2 : 2);
    const radiusKm = config.radiusKm ?? 7;
    const windowWidthMinutes = config.windowWidthMinutes ?? 55;
    const depotStartTime = config.depotStartTime ?? 300;
    const depotEndTime = config.depotEndTime ?? 430;
    const serviceTime = config.serviceTime ?? 2;
    const seed = config.seed ?? 42;
    const vehicleCapacity =
      config.vehicleCapacity ?? Math.ceil(customerCount / vehicleCount) + 1;

    if (customerCount < 1 || customerCount > 40) {
      throw new Error(`customerCount must be in [1, 40], got ${customerCount}`);
    }
    if (vehicleCount < 1 || vehicleCount > 6) {
      throw new Error(`vehicleCount must be in [1, 6], got ${vehicleCount}`);
    }
    if (depotEndTime - depotStartTime < windowWidthMinutes + 20) {
      throw new Error('Depot time window is too narrow for generated customers');
    }

    const depots = this.buildDepots(mode, depotStartTime, depotEndTime);
    const vehicles = this.buildVehicles(mode, depots, vehicleCount, vehicleCapacity);
    const customers = this.buildCustomers({
      mode,
      customerCount,
      radiusKm,
      windowWidthMinutes,
      depotStartTime,
      depotEndTime,
      serviceTime,
      seed,
      depots,
    });
    const matrix = await this.distanceService.getMatrix([
      ...depots.map((depot) => depot.coordinates),
      ...customers.map((customer) => customer.coordinates),
    ]);

    return {
      id: `multi-hub-${mode}-N${customerCount}-V${vehicleCount}-r${radiusKm}-w${windowWidthMinutes}-s${seed}`,
      mode,
      depots,
      vehicles,
      customers,
      distanceMatrix: matrix.distances,
      durationMatrix: matrix.durations,
    };
  }

  private buildDepots(
    mode: MultiHubMode,
    depotStartTime: number,
    depotEndTime: number,
  ): VrptwDepot[] {
    const eastDepot: VrptwDepot = {
      id: 'hub-bxmd',
      name: 'Ben Xe Mien Dong',
      coordinates: HUB_BXMD,
      timeWindow: { earliest: depotStartTime, latest: depotEndTime },
    };

    if (mode === 'vrptw') {
      return [eastDepot];
    }

    return [
      {
        id: 'hub-bxmt',
        name: 'Ben Xe Mien Tay',
        coordinates: HUB_BXMT,
        timeWindow: { earliest: depotStartTime, latest: depotEndTime },
      },
      eastDepot,
    ];
  }

  private buildVehicles(
    mode: MultiHubMode,
    depots: readonly VrptwDepot[],
    vehicleCount: number,
    vehicleCapacity: number,
  ): VrptwVehicle[] {
    const vehicles: VrptwVehicle[] = [];
    for (let i = 0; i < vehicleCount; i++) {
      const depotIndex = mode === 'mdvrptw' ? i % depots.length : 0;
      vehicles.push({
        id: `vehicle-${i + 1}`,
        name: `Shuttle ${i + 1}`,
        startDepotIndex: depotIndex,
        endDepotIndex: depotIndex,
        capacity: vehicleCapacity,
        color: VEHICLE_COLORS[i % VEHICLE_COLORS.length],
      });
    }
    return vehicles;
  }

  private buildCustomers(params: {
    mode: MultiHubMode;
    customerCount: number;
    radiusKm: number;
    windowWidthMinutes: number;
    depotStartTime: number;
    depotEndTime: number;
    serviceTime: number;
    seed: number;
    depots: readonly VrptwDepot[];
  }): VrptwCustomer[] {
    const rng = new SeededRandom(params.seed);
    const customers: VrptwCustomer[] = [];
    const westCount = Math.ceil(params.customerCount / 2);

    for (let i = 0; i < params.customerCount; i++) {
      const isWestCluster = i < westCount;
      const center = isWestCluster ? HUB_BXMT : HUB_BXMD;
      const coords = pointInDisk(rng, center, params.radiusKm);
      const windowCenter = rng.uniform(
        params.depotStartTime + 20,
        params.depotEndTime - 25,
      );
      const halfWidth =
        (params.windowWidthMinutes / 2) * rng.uniform(0.75, 1.25);
      const earliest = Math.max(
        params.depotStartTime,
        Math.floor(windowCenter - halfWidth),
      );
      const latest = Math.min(
        params.depotEndTime,
        Math.ceil(windowCenter + halfWidth),
      );
      const preferredDepotId =
        params.mode === 'mdvrptw'
          ? isWestCluster
            ? 'hub-bxmt'
            : 'hub-bxmd'
          : params.depots[0].id;

      customers.push({
        id: `mh-c${i + 1}`,
        name: `${isWestCluster ? 'West' : 'East'} Cluster ${i + 1}`,
        coordinates: coords,
        serviceTime: params.serviceTime,
        demand: 1,
        timeWindow: { earliest, latest },
        preferredDepotId,
      });
    }

    return customers;
  }
}
