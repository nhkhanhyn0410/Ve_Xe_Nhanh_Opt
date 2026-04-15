import { Injectable } from '@nestjs/common';
import { TSPTWSolver, SolverConfig } from './solver.interface';
import { TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution, emptySolution } from '../models/tsptw-solution';

/**
 * 2-opt Local Search solver.
 *
 * Thuật toán:
 *   1. Bắt đầu từ nghiệm khởi tạo (thường từ GreedySolver)
 *   2. Lặp đi lặp lại:
 *      - Với mỗi cặp edge (i, i+1) và (j, j+1), thử REVERSE đoạn [i+1..j]
 *      - Nếu cải thiện → chấp nhận
 *   3. Dừng khi không còn cải thiện (local optimum)
 *
 * Độ phức tạp: O(N²) mỗi iteration, thường hội tụ sau vài chục iteration.
 * Chất lượng: 5-15% tệ hơn optimal cho TSP cổ điển.
 *
 * CHÚ Ý: 2-opt có thể phá vỡ time window constraint.
 * Phải check feasibility sau mỗi swap, hoặc penalty vào objective.
 *
 * Vai trò:
 *   - Đứng riêng: baseline local search
 *   - Kết hợp với ACO thành ACO+LS hybrid (điểm nhấn của báo cáo)
 *
 * TODO: Implement (Week 2 Day 8-10).
 */
@Injectable()
export class TwoOptSolver extends TSPTWSolver {
  readonly name = 'two-opt';

  solve(
    instance: TSPTWInstance,
    config?: SolverConfig,
  ): Promise<TSPTWSolution> {
    void instance;
    void config;
    // TODO Week 2: Implement 2-opt với feasibility check
    return Promise.resolve(emptySolution(this.name));
  }
}
