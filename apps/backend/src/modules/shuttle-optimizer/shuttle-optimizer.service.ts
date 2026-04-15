import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { TSPTWSolver } from './solvers/solver.interface';
import { BruteForceSolver } from './solvers/brute-force.solver';
import { GreedySolver } from './solvers/greedy.solver';
import { TwoOptSolver } from './solvers/two-opt.solver';
import { SimulatedAnnealingSolver } from './solvers/simulated-annealing.solver';
import { AntColonySolver } from './solvers/ant-colony.solver';
import { OrToolsSolver } from './solvers/or-tools.solver';
import { OsrmDistanceMatrixService } from './distance/osrm-distance-matrix.service';
import { TSPTWInstance } from './models/tsptw-instance';
import { TSPTWSolution } from './models/tsptw-solution';
import { SolveRequestDto } from './dto/solve-request.dto';
import { SolveResponseDto, RouteStepDto } from './dto/solve-response.dto';

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
    return this.toResponseDto(instance, solution);
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

    return {
      solverName: solution.solverName,
      totalDistance: solution.totalDistance,
      totalDuration: solution.totalDuration,
      isFeasible: solution.isFeasible,
      violationCount: solution.violationCount,
      runtimeMs: solution.runtimeMs,
      steps,
    };
  }
}
