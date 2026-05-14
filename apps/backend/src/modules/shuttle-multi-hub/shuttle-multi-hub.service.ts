import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OsrmDistanceMatrixService } from '../shuttle-optimizer/distance/osrm-distance-matrix.service';
import { OsrmService } from '../osrm/osrm.service';
import {
  MultiHubGenerateConfig,
  MultiHubInstanceGenerator,
} from './benchmark/instance-generator';
import {
  buildSeedInstance,
  SEED_HUB_BXMD,
  SEED_HUB_BXMT,
} from './benchmark/seed-data';
import { SolveMultiHubRequestDto } from './dto/solve-request.dto';
import {
  MultiHubSolveResponseDto,
  MultiHubVehicleRouteDto,
} from './dto/solve-response.dto';
import {
  customerMatrixIndex,
  MultiHubMode,
  VrptwInstance,
  VrptwVehicle,
} from './models/vrptw-instance';
import { VrptwSolution } from './models/vrptw-solution';
import { MultiHubVrptwSolver } from './solvers/solver.interface';
import {
  AcoTwoOptConfig,
  AcoTwoOptVrptwSolver,
} from './solvers/aco-two-opt-vrptw.solver';
import { AcoTwoOptMdvrptwSolver } from './solvers/aco-two-opt-mdvrptw.solver';

const FALLBACK_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#ea580c'];

@Injectable()
export class ShuttleMultiHubService {
  private readonly logger = new Logger(ShuttleMultiHubService.name);
  private readonly solvers: Map<string, MultiHubVrptwSolver>;

  constructor(
    private readonly generator: MultiHubInstanceGenerator,
    private readonly distanceService: OsrmDistanceMatrixService,
    private readonly osrmService: OsrmService,
    vrptwSolver: AcoTwoOptVrptwSolver,
    mdvrptwSolver: AcoTwoOptMdvrptwSolver,
  ) {
    this.solvers = new Map<string, MultiHubVrptwSolver>([
      [vrptwSolver.name, vrptwSolver],
      [mdvrptwSolver.name, mdvrptwSolver],
    ]);
  }

  listSolvers(): string[] {
    return Array.from(this.solvers.keys());
  }

  /**
   * Lấy polyline đường thật BXMT ↔ BXMĐ qua OSRM để vẽ tuyến xe khách chính
   * trên bản đồ (thay cho đường thẳng chim bay).
   *
   * Trả `null` nếu OSRM không khả dụng — frontend sẽ tự fallback.
   */
  async getMainRouteGeometry(): Promise<{
    from: [number, number];
    to: [number, number];
    geometry: [number, number][] | null;
  }> {
    if (!this.osrmService.isAvailable()) {
      return { from: SEED_HUB_BXMT, to: SEED_HUB_BXMD, geometry: null };
    }

    const geometry = await this.osrmService.getRouteGeometry([
      { lng: SEED_HUB_BXMT[0], lat: SEED_HUB_BXMT[1] },
      { lng: SEED_HUB_BXMD[0], lat: SEED_HUB_BXMD[1] },
    ]);

    return {
      from: SEED_HUB_BXMT,
      to: SEED_HUB_BXMD,
      geometry,
    };
  }

  async solveDemo(
    config: MultiHubGenerateConfig,
    solverName?: string,
  ): Promise<MultiHubSolveResponseDto> {
    const instance = await this.generator.generate(config);
    return this.solveInstance(instance, solverName);
  }

  /**
   * Giải instance từ seed data CỐ ĐỊNH (không random).
   * Dùng để demo ổn định + debug solver (cùng input → cùng output mọi lần).
   */
  async solveSeed(
    mode: MultiHubMode,
    solverName?: string,
  ): Promise<MultiHubSolveResponseDto> {
    const instance = await buildSeedInstance(mode, this.distanceService);
    return this.solveInstance(instance, solverName);
  }

  async solve(dto: SolveMultiHubRequestDto): Promise<MultiHubSolveResponseDto> {
    const instance = await this.buildInstance(dto);
    return this.solveInstance(instance, dto.solver, dto.solverConfig);
  }

  private async solveInstance(
    instance: VrptwInstance,
    solverName?: string,
    solverConfig?: AcoTwoOptConfig,
  ): Promise<MultiHubSolveResponseDto> {
    const selectedSolverName = solverName ?? this.defaultSolverName(instance.mode);
    const solver = this.solvers.get(selectedSolverName);
    if (!solver) {
      throw new BadRequestException(
        `Solver '${selectedSolverName}' does not exist. Available: ${this.listSolvers().join(', ')}`,
      );
    }

    this.logger.log(
      `[${instance.mode}] Solving N=${instance.customers.length}, V=${instance.vehicles.length} with ${solver.name}`,
    );
    const solution = await solver.solve(instance, solverConfig);
    const geometries = await this.fetchRouteGeometries(instance, solution);
    return this.toResponseDto(instance, solution, geometries);
  }

  private defaultSolverName(mode: MultiHubMode): string {
    return mode === 'mdvrptw' ? 'aco-2opt-mdvrptw' : 'aco-2opt-vrptw';
  }

  private async buildInstance(
    dto: SolveMultiHubRequestDto,
  ): Promise<VrptwInstance> {
    if (!dto.depots.length) {
      throw new BadRequestException('depots must contain at least 1 depot');
    }
    if (!dto.vehicles.length) {
      throw new BadRequestException('vehicles must contain at least 1 vehicle');
    }
    if (!dto.customers.length) {
      throw new BadRequestException('customers must contain at least 1 customer');
    }

    const depots = dto.depots.map((depot) => {
      if (depot.timeWindow.latest < depot.timeWindow.earliest) {
        throw new BadRequestException(
          `Depot '${depot.id}' has invalid time window`,
        );
      }
      return {
        id: depot.id,
        name: depot.name,
        coordinates: depot.coordinates,
        timeWindow: depot.timeWindow,
      };
    });

    const vehicles: VrptwVehicle[] = dto.vehicles.map((vehicle, index) => {
      if (
        vehicle.startDepotIndex >= depots.length ||
        vehicle.endDepotIndex >= depots.length
      ) {
        throw new BadRequestException(
          `Vehicle '${vehicle.id}' references a depot index outside depots[]`,
        );
      }
      return {
        id: vehicle.id,
        name: vehicle.name,
        startDepotIndex: vehicle.startDepotIndex,
        endDepotIndex: vehicle.endDepotIndex,
        capacity: vehicle.capacity,
        color: vehicle.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
      };
    });

    const customers = dto.customers.map((customer) => {
      if (customer.timeWindow.latest < customer.timeWindow.earliest) {
        throw new BadRequestException(
          `Customer '${customer.id}' has invalid time window`,
        );
      }
      return {
        id: customer.id,
        name: customer.name,
        coordinates: customer.coordinates,
        serviceTime: customer.serviceTime,
        demand: customer.demand,
        timeWindow: customer.timeWindow,
        preferredDepotId: customer.preferredDepotId,
      };
    });

    const matrix = await this.distanceService.getMatrix([
      ...depots.map((depot) => depot.coordinates),
      ...customers.map((customer) => customer.coordinates),
    ]);

    return {
      id: `multi-hub-request-${Date.now()}`,
      mode: dto.mode,
      depots,
      vehicles,
      customers,
      distanceMatrix: matrix.distances,
      durationMatrix: matrix.durations,
    };
  }

  private async fetchRouteGeometries(
    instance: VrptwInstance,
    solution: VrptwSolution,
  ): Promise<Map<string, [number, number][]>> {
    const out = new Map<string, [number, number][]>();
    if (!this.osrmService.isAvailable()) return out;

    for (const route of solution.routes) {
      if (route.customerIndices.length === 0) continue;
      const vehicle = instance.vehicles.find((v) => v.id === route.vehicleId);
      if (!vehicle) continue;
      const waypoints = [
        instance.depots[vehicle.startDepotIndex].coordinates,
        ...route.customerIndices.map(
          (customerIndex) => instance.customers[customerIndex].coordinates,
        ),
        instance.depots[vehicle.endDepotIndex].coordinates,
      ].map(([lng, lat]) => ({ lng, lat }));

      const geometry = await this.osrmService.getRouteGeometry(waypoints);
      if (geometry) out.set(route.vehicleId, geometry);
    }

    return out;
  }

  private toResponseDto(
    instance: VrptwInstance,
    solution: VrptwSolution,
    geometries: Map<string, [number, number][]>,
  ): MultiHubSolveResponseDto {
    const routes: MultiHubVehicleRouteDto[] = solution.routes.map((route) => {
      const vehicle = instance.vehicles.find((v) => v.id === route.vehicleId);
      if (!vehicle) {
        throw new Error(`Vehicle '${route.vehicleId}' missing from instance`);
      }
      const startDepot = instance.depots[vehicle.startDepotIndex];
      const endDepot = instance.depots[vehicle.endDepotIndex];

      return {
        vehicleId: route.vehicleId,
        vehicleName: route.vehicleName,
        color: vehicle.color,
        depotName: startDepot.name,
        depotCoordinates: startDepot.coordinates,
        endDepotName: endDepot.name,
        endDepotCoordinates: endDepot.coordinates,
        customerCount: route.customerIndices.length,
        load: route.load,
        totalDistance: route.totalDistance,
        totalDuration: route.totalDuration,
        depotArrivalTime: route.depotArrivalTime,
        isFeasible: route.isFeasible,
        violationCount: route.violationCount,
        steps: route.customerIndices.map((customerIndex, index) => {
          const customer = instance.customers[customerIndex];
          return {
            customerId: customer.id,
            customerName: customer.name,
            coordinates: customer.coordinates,
            arrivalTime: route.arrivalTimes[index],
            departureTime: route.departureTimes[index],
            distanceFromPrev:
              route.distanceFromPrev[index] ??
              this.distanceFromPrevious(instance, route.customerIndices, index),
            timeWindow: [
              customer.timeWindow.earliest,
              customer.timeWindow.latest,
            ] as [number, number],
          };
        }),
        routeGeometry: geometries.get(route.vehicleId),
      };
    });

    return {
      solverName: solution.solverName,
      mode: solution.mode,
      depotCount: instance.depots.length,
      vehicleCount: instance.vehicles.length,
      customerCount: instance.customers.length,
      totalDistance: solution.totalDistance,
      totalDuration: solution.totalDuration,
      isFeasible: solution.isFeasible,
      violationCount: solution.violationCount,
      runtimeMs: solution.runtimeMs,
      unassignedCustomerIds: solution.unassignedCustomerIds,
      routes,
    };
  }

  private distanceFromPrevious(
    instance: VrptwInstance,
    customerIndices: readonly number[],
    routeIndex: number,
  ): number {
    const current = customerMatrixIndex(instance, customerIndices[routeIndex]);
    const previous =
      routeIndex === 0
        ? 0
        : customerMatrixIndex(instance, customerIndices[routeIndex - 1]);
    return instance.distanceMatrix[previous]?.[current] ?? 0;
  }
}
