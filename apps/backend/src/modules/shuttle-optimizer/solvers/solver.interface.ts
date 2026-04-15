import { TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution } from '../models/tsptw-solution';

/**
 * Cấu hình chung cho mọi solver.
 * Mỗi solver cụ thể có thể extend thêm param riêng (alpha/beta cho ACO, temperature cho SA...).
 */
export interface SolverConfig {
  /** Giới hạn thời gian chạy tối đa (ms) */
  timeLimitMs?: number;
  /** Random seed để reproducible benchmark */
  seed?: number;
  /** Log verbose hay không */
  verbose?: boolean;
}

/**
 * Interface chung cho TẤT CẢ thuật toán TSPTW.
 * Nhờ interface này, benchmark runner có thể gọi chung tất cả solver qua 1 vòng lặp:
 *
 *   for (const solver of allSolvers) {
 *     const result = await solver.solve(instance);
 *     results.push(result);
 *   }
 *
 * Mọi solver cụ thể (BruteForce, Greedy, TwoOpt, SA, ACO, OrTools)
 * đều extend class này và implement method `solve`.
 */
export abstract class TSPTWSolver {
  /** Tên định danh solver — dùng trong log/report/chart */
  abstract readonly name: string;

  /**
   * Giải bài toán và trả về nghiệm.
   * Method này PHẢI tự đo thời gian và gán vào `solution.runtimeMs`.
   */
  abstract solve(
    instance: TSPTWInstance,
    config?: SolverConfig,
  ): Promise<TSPTWSolution>;
}
