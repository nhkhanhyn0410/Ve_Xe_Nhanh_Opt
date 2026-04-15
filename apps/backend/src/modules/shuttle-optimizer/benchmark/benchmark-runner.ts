import { Injectable, Logger } from '@nestjs/common';
import { TSPTWSolver } from '../solvers/solver.interface';
import { TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution } from '../models/tsptw-solution';

export interface BenchmarkResult {
  instanceId: string;
  solverName: string;
  totalDistance: number;
  totalDuration: number;
  isFeasible: boolean;
  runtimeMs: number;
  /** Gap (%) so với nghiệm tốt nhất (OR-Tools hoặc BruteForce) trên cùng instance */
  optimalityGap?: number;
}

/**
 * BenchmarkRunner chạy TẤT CẢ solver trên TẤT CẢ instance,
 * rồi tổng hợp thành bảng kết quả để export ra CSV/JSON cho báo cáo.
 *
 * Luồng chạy:
 *   1. Nhận danh sách solvers + danh sách instances từ caller
 *   2. Với mỗi (solver, instance), chạy N lần (để có statistical average)
 *   3. Ghi kết quả: totalCost, runtime, feasibility
 *   4. Sau khi chạy xong, tính optimalityGap dựa trên solver reference
 *   5. Export ra CSV
 *
 * TODO Week 4 Day 22-24: Implement.
 */
@Injectable()
export class BenchmarkRunner {
  private readonly logger = new Logger(BenchmarkRunner.name);

  runAll(
    solvers: TSPTWSolver[],
    instances: TSPTWInstance[],
    runsPerInstance = 5,
  ): Promise<BenchmarkResult[]> {
    void solvers;
    void instances;
    void runsPerInstance;
    // TODO Week 4: loop + stat aggregation + optimality gap calculation
    return Promise.reject(new Error('Not implemented yet'));
  }

  /**
   * Chạy 1 solver trên 1 instance (không lặp).
   * Dùng để benchmark nhanh hoặc test lẻ.
   */
  async runSingle(
    solver: TSPTWSolver,
    instance: TSPTWInstance,
  ): Promise<TSPTWSolution> {
    this.logger.log(`Running ${solver.name} on instance ${instance.id}`);
    return solver.solve(instance);
  }
}
