import { Injectable } from '@nestjs/common';
import { TSPTWSolver, SolverConfig } from './solver.interface';
import { TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution, emptySolution } from '../models/tsptw-solution';

/**
 * Brute Force solver — dùng Held-Karp Dynamic Programming.
 *
 * Độ phức tạp: O(N² × 2^N) thời gian, O(N × 2^N) bộ nhớ.
 * Thực tế chạy được đến N ≈ 15-18 trong thời gian chấp nhận được.
 *
 * Vai trò: GROUND TRUTH — dùng để đánh giá optimality gap của các thuật toán khác.
 * Tất cả thuật toán heuristic/metaheuristic sẽ so sánh với nghiệm của solver này
 * trên instance nhỏ (N ≤ 15).
 *
 * TODO: Implement Held-Karp DP (Week 1 Day 3-4).
 */
@Injectable()
export class BruteForceSolver extends TSPTWSolver {
  readonly name = 'brute-force';

  solve(
    instance: TSPTWInstance,
    config?: SolverConfig,
  ): Promise<TSPTWSolution> {
    void instance;
    void config;
    // TODO Week 1: Implement Held-Karp DP với time window constraint
    return Promise.resolve(emptySolution(this.name));
  }
}
