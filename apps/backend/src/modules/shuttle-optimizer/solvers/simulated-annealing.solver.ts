import { Injectable } from '@nestjs/common';
import { TSPTWSolver, SolverConfig } from './solver.interface';
import { TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution, emptySolution } from '../models/tsptw-solution';

/**
 * Cấu hình riêng cho Simulated Annealing.
 */
export interface SAConfig extends SolverConfig {
  /** Nhiệt độ ban đầu */
  initialTemperature?: number;
  /** Nhiệt độ tối thiểu (điều kiện dừng) */
  minTemperature?: number;
  /** Tỉ lệ làm nguội (geometric: T = T × coolingRate) */
  coolingRate?: number;
  /** Số iteration tại mỗi mức nhiệt độ */
  iterationsPerTemperature?: number;
  /** Loại cooling schedule */
  coolingSchedule?: 'linear' | 'geometric' | 'logarithmic';
}

/**
 * Simulated Annealing solver.
 *
 * Thuật toán:
 *   1. Khởi tạo nghiệm ban đầu (từ Greedy)
 *   2. Tại mỗi iteration:
 *      - Sinh neighbor bằng 1 move ngẫu nhiên (swap, 2-opt, or-opt)
 *      - Tính delta = cost(neighbor) - cost(current)
 *      - Nếu delta < 0 → chấp nhận
 *      - Nếu delta ≥ 0 → chấp nhận với xác suất exp(-delta / T)
 *   3. Giảm nhiệt độ T theo schedule
 *   4. Dừng khi T < minT hoặc vượt time limit
 *
 * Điểm mạnh: thoát được local optimum nhờ random acceptance.
 * Điểm yếu: nhạy với parameter tuning.
 *
 * Vai trò: classic metaheuristic, so sánh với ACO.
 *
 * TODO: Implement (Week 2 Day 10-13).
 */
@Injectable()
export class SimulatedAnnealingSolver extends TSPTWSolver {
  readonly name = 'simulated-annealing';

  solve(instance: TSPTWInstance, config?: SAConfig): Promise<TSPTWSolution> {
    void instance;
    void config;
    // TODO Week 2: Implement SA với cooling schedule configurable
    return Promise.resolve(emptySolution(this.name));
  }
}
