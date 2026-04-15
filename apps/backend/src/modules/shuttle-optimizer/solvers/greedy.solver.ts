import { Injectable } from '@nestjs/common';
import { TSPTWSolver, SolverConfig } from './solver.interface';
import { TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution, emptySolution } from '../models/tsptw-solution';

/**
 * Greedy Nearest Neighbor solver.
 *
 * Thuật toán:
 *   1. Bắt đầu từ depot
 *   2. Mỗi bước, chọn customer gần nhất chưa thăm (ưu tiên customer có earliest sắp hết)
 *   3. Lặp đến khi đã thăm hết tất cả customer
 *   4. Quay về depot
 *
 * Độ phức tạp: O(N²)
 * Chất lượng: thường 30-50% tệ hơn optimal (theo literature cho TSP)
 *
 * Vai trò: BASELINE nhanh, so sánh với các thuật toán tốt hơn.
 *
 * TODO: Implement (Week 1 Day 4-5).
 */
@Injectable()
export class GreedySolver extends TSPTWSolver {
  readonly name = 'greedy-nearest-neighbor';

  solve(
    instance: TSPTWInstance,
    config?: SolverConfig,
  ): Promise<TSPTWSolution> {
    void instance;
    void config;
    // TODO Week 1: Implement nearest neighbor với tie-break theo time window
    return Promise.resolve(emptySolution(this.name));
  }
}
