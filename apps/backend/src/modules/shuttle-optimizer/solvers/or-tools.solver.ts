import { Injectable, Logger } from '@nestjs/common';
import { TSPTWSolver, SolverConfig } from './solver.interface';
import { TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution, emptySolution } from '../models/tsptw-solution';

/**
 * Google OR-Tools solver — dùng như BASELINE CÔNG NGHIỆP.
 *
 * Strategy: spawn Python subprocess chạy OR-Tools routing solver,
 * vì binding Node.js của OR-Tools không đủ feature.
 *
 * Pipeline:
 *   1. NestJS ghi instance ra file JSON tạm
 *   2. spawn('python', ['scripts/or_tools_solver.py', inputPath, outputPath])
 *   3. Đọc outputPath → parse về TSPTWSolution
 *
 * Script Python mẫu (~50 dòng):
 *   from ortools.constraint_solver import routing_enums_pb2, pywrapcp
 *   manager = pywrapcp.RoutingIndexManager(N+1, 1, 0)
 *   routing = pywrapcp.RoutingModel(manager)
 *   # ... thêm time window dimension
 *   search_params = pywrapcp.DefaultRoutingSearchParameters()
 *   search_params.local_search_metaheuristic = GUIDED_LOCAL_SEARCH
 *   solution = routing.SolveWithParameters(search_params)
 *
 * Vai trò: upper bound chất lượng — các thuật toán tự viết so với nghiệm của OR-Tools.
 * Kỳ vọng ACO+LS đạt trong 3-5% gap so với OR-Tools cho instance vừa.
 *
 * TODO Week 3 Day 20-21: Viết Python script + wrapper này.
 */
@Injectable()
export class OrToolsSolver extends TSPTWSolver {
  readonly name = 'or-tools';
  private readonly logger = new Logger(OrToolsSolver.name);

  solve(
    instance: TSPTWInstance,
    config?: SolverConfig,
  ): Promise<TSPTWSolution> {
    void instance;
    void config;
    // TODO Week 3: spawn Python subprocess gọi OR-Tools
    this.logger.warn(`${this.name} solver chưa implement`);
    return Promise.resolve(emptySolution(this.name));
  }
}
