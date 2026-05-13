import { Module } from '@nestjs/common';
import { ShuttleOptimizerController } from './shuttle-optimizer.controller';
import { ShuttleOptimizerService } from './shuttle-optimizer.service';
import { OsrmDistanceMatrixService } from './distance/osrm-distance-matrix.service';
import { BruteForceSolver } from './solvers/brute-force.solver';
import { GreedySolver } from './solvers/greedy.solver';
import { TwoOptSolver } from './solvers/two-opt.solver';
import { SimulatedAnnealingSolver } from './solvers/simulated-annealing.solver';
import { AntColonySolver } from './solvers/ant-colony.solver';
import { OrToolsSolver } from './solvers/or-tools.solver';
import { BenchmarkRunner } from './benchmark/benchmark-runner';
import { InstanceGenerator } from './benchmark/instance-generator';
import { AcoTuner } from './benchmark/aco-tuner';

/**
 * Module tối ưu lộ trình xe shuttle.
 *
 * Thuật toán chính: Ant Colony Optimization + 2-opt Local Search hybrid.
 * Bài toán: TSPTW (Traveling Salesman Problem with Time Windows).
 *
 * Đây là module phục vụ đồ án môn học AI, đồng thời làm tính năng thật cho nền tảng.
 */
@Module({
  controllers: [ShuttleOptimizerController],
  providers: [
    // Core service
    ShuttleOptimizerService,
    OsrmDistanceMatrixService,

    // Solvers
    BruteForceSolver,
    GreedySolver,
    TwoOptSolver,
    SimulatedAnnealingSolver,
    AntColonySolver,
    OrToolsSolver,

    // Benchmark tools
    BenchmarkRunner,
    InstanceGenerator,
    AcoTuner,
  ],
  exports: [ShuttleOptimizerService],
})
export class ShuttleOptimizerModule {}
