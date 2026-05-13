import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { TSPTWSolver } from './solvers/solver.interface';
import { BruteForceSolver } from './solvers/brute-force.solver';
import { GreedySolver } from './solvers/greedy.solver';
import { TwoOptSolver } from './solvers/two-opt.solver';
import { SimulatedAnnealingSolver } from './solvers/simulated-annealing.solver';
import { AntColonySolver } from './solvers/ant-colony.solver';
import { OrToolsSolver } from './solvers/or-tools.solver';
import { OsrmDistanceMatrixService } from './distance/osrm-distance-matrix.service';
import { OsrmService } from '../osrm/osrm.service';
import {
  InstanceGenerator,
  GenerateConfig,
} from './benchmark/instance-generator';
import { TSPTWInstance } from './models/tsptw-instance';
import { TSPTWSolution } from './models/tsptw-solution';
import { SolveRequestDto } from './dto/solve-request.dto';
import { SolveResponseDto, RouteStepDto } from './dto/solve-response.dto';
import { DEMO_SEED } from './benchmark/seed-data';

/**
 * Facade service cho module shuttle-optimizer.
 *
 * Trách nhiệm:
 *   1. Nhận SolveRequestDto từ controller
 *   2. Chuyển đổi DTO → TSPTWInstance (gọi OSRM lấy distance matrix)
 *   3. Chọn solver phù hợp theo tên
 *   4. Gọi solver.solve() và nhận TSPTWSolution
 *   5. Chuyển đổi solution → SolveResponseDto
 *
 * Default solver: aco-2opt-hybrid (thuật toán chính của đề tài).
 */
@Injectable()
export class ShuttleOptimizerService {
  private readonly logger = new Logger(ShuttleOptimizerService.name);
  private readonly solvers: Map<string, TSPTWSolver>;

  constructor(
    private readonly distanceService: OsrmDistanceMatrixService,
    private readonly osrmService: OsrmService,
    private readonly instanceGenerator: InstanceGenerator,
    bruteForce: BruteForceSolver,
    greedy: GreedySolver,
    twoOpt: TwoOptSolver,
    simulatedAnnealing: SimulatedAnnealingSolver,
    antColony: AntColonySolver,
    orTools: OrToolsSolver,
  ) {
    this.solvers = new Map<string, TSPTWSolver>([
      [bruteForce.name, bruteForce],
      [greedy.name, greedy],
      [twoOpt.name, twoOpt],
      [simulatedAnnealing.name, simulatedAnnealing],
      [antColony.name, antColony],
      [orTools.name, orTools],
    ]);
  }

  /**
   * Danh sách tên tất cả solver hiện có (cho endpoint GET /solvers).
   */
  listSolvers(): string[] {
    return Array.from(this.solvers.keys());
  }

  /**
   * Giải bài toán từ request của client.
   */
  async solve(dto: SolveRequestDto): Promise<SolveResponseDto> {
    const solverName = dto.solver ?? 'aco-2opt-hybrid';
    const solver = this.solvers.get(solverName);
    if (!solver) {
      throw new BadRequestException(
        `Solver '${solverName}' không tồn tại. Danh sách: ${this.listSolvers().join(', ')}`,
      );
    }

    const instance = await this.buildInstance(dto);
    this.logger.log(
      `Solving instance N=${instance.customers.length} with ${solver.name}`,
    );

    const solution = await solver.solve(instance);
    const routeGeometry = await this.fetchRouteGeometry(instance, solution);
    return this.toResponseDto(instance, solution, routeGeometry);
  }

  /**
   * Tạo instance từ seed data (10 điểm đón thật ở TPHCM).
   * Dùng Haversine để build distance matrix — không cần OSRM hay DB.
   * Phục vụ endpoint GET /demo và test solver nhanh.
   */
  async buildDemoInstance(solverName?: string): Promise<SolveResponseDto> {
    const solver = this.solvers.get(solverName ?? 'greedy-nearest-neighbor');
    if (!solver) {
      throw new BadRequestException(
        `Solver '${solverName}' không tồn tại. Danh sách: ${this.listSolvers().join(', ')}`,
      );
    }

    const instance = await this.buildInstanceFromSeed();
    this.logger.log(
      `[DEMO] Solving N=${instance.customers.length} customers with ${solver.name}`,
    );

    const solution = await solver.solve(instance);
    const routeGeometry = await this.fetchRouteGeometry(instance, solution);
    return this.toResponseDto(instance, solution, routeGeometry);
  }

  /**
   * Sinh instance ngẫu nhiên (qua InstanceGenerator) rồi giải.
   * Phục vụ benchmark + cho UI test với N tuỳ chỉnh, seed reproducible.
   */
  async solveRandomInstance(
    config: GenerateConfig,
    solverName?: string,
  ): Promise<SolveResponseDto> {
    const solver = this.solvers.get(solverName ?? 'greedy-nearest-neighbor');
    if (!solver) {
      throw new BadRequestException(
        `Solver '${solverName}' không tồn tại. Danh sách: ${this.listSolvers().join(', ')}`,
      );
    }

    const instance = await this.instanceGenerator.generate(config);
    this.logger.log(
      `[RANDOM] Solving N=${instance.customers.length} (id=${instance.id}) with ${solver.name}`,
    );

    const solution = await solver.solve(instance);
    const routeGeometry = await this.fetchRouteGeometry(instance, solution);
    return this.toResponseDto(instance, solution, routeGeometry);
  }

  /**
   * Gọi OSRM để lấy polyline đường thật theo thứ tự ghé thăm của solution.
   * Thứ tự waypoint: depot → customer[route[0]] → ... → customer[route[N-1]] → depot.
   * Trả null khi OSRM không khả dụng (frontend sẽ fallback sang đường thẳng).
   */
  private async fetchRouteGeometry(
    instance: TSPTWInstance,
    solution: TSPTWSolution,
  ): Promise<[number, number][] | undefined> {
    if (!this.osrmService.isAvailable() || solution.route.length === 0) {
      return undefined;
    }
    const waypoints = [
      {
        lng: instance.depot.coordinates[0],
        lat: instance.depot.coordinates[1],
      },
      ...solution.route.map((idx) => ({
        lng: instance.customers[idx].coordinates[0],
        lat: instance.customers[idx].coordinates[1],
      })),
      {
        lng: instance.depot.coordinates[0],
        lat: instance.depot.coordinates[1],
      },
    ];
    const geometry = await this.osrmService.getRouteGeometry(waypoints);
    return geometry ?? undefined;
  }

  /**
   * Build TSPTWInstance từ DEMO_SEED bằng Haversine distance matrix.
   */
  private async buildInstanceFromSeed(): Promise<TSPTWInstance> {
    const allNodes = [DEMO_SEED.depot, ...DEMO_SEED.customers];
    const coordinates = allNodes.map((n) => n.coordinates);
    const matrix = await this.distanceService.getMatrix(coordinates);

    return {
      ...DEMO_SEED,
      distanceMatrix: matrix.distances,
      durationMatrix: matrix.durations,
    };
  }

  /**
   * Chuyển SolveRequestDto → TSPTWInstance.
   * TODO Week 1: implement đầy đủ — hiện tại throw để nhắc implement.
   */
  private buildInstance(dto: SolveRequestDto): Promise<TSPTWInstance> {
    void dto;
    // TODO: gọi distanceService.getMatrix, sinh distanceMatrix + durationMatrix
    return Promise.reject(new Error('buildInstance chưa implement'));
  }

  /**
   * Chuyển TSPTWSolution → SolveResponseDto.
   */
  private toResponseDto(
    instance: TSPTWInstance,
    solution: TSPTWSolution,
    routeGeometry?: [number, number][],
  ): SolveResponseDto {
    const steps: RouteStepDto[] = solution.route.map((customerIdx, i) => {
      const customer = instance.customers[customerIdx];
      const arrivalTime = solution.arrivalTimes[i] ?? 0;
      const prevIdx = i === 0 ? 0 : solution.route[i - 1] + 1;
      const curIdx = customerIdx + 1;
      const distanceFromPrev = instance.distanceMatrix[prevIdx][curIdx] ?? 0;

      return {
        customerId: customer.id,
        customerName: customer.name,
        coordinates: customer.coordinates,
        arrivalTime,
        departureTime: arrivalTime + customer.serviceTime,
        distanceFromPrev,
      };
    });

    // Tính giờ về depot (điểm lên xe khách chính):
    //   = giờ rời khách cuối + thời gian leg cuối từ khách cuối → depot
    const n = solution.route.length;
    let depotArrivalTime = instance.depotStartTime;
    if (n > 0) {
      const lastCustomerIdx = solution.route[n - 1];
      const lastDeparture =
        (solution.arrivalTimes[n - 1] ?? 0) +
        instance.customers[lastCustomerIdx].serviceTime;
      const lastLegDuration =
        instance.durationMatrix[lastCustomerIdx + 1]?.[0] ?? 0;
      depotArrivalTime = lastDeparture + lastLegDuration;
    }

    return {
      solverName: solution.solverName,
      totalDistance: solution.totalDistance,
      totalDuration: solution.totalDuration,
      isFeasible: solution.isFeasible,
      violationCount: solution.violationCount,
      runtimeMs: solution.runtimeMs,
      depotName: instance.depot.name,
      depotCoordinates: instance.depot.coordinates,
      depotDepartureTime: instance.depotStartTime,
      depotArrivalTime,
      depotEndWindow: instance.depotEndTime,
      steps,
      routeGeometry,
    };
  }
}
