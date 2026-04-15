import { Injectable } from '@nestjs/common';
import { TSPTWSolver, SolverConfig } from './solver.interface';
import { TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution, emptySolution } from '../models/tsptw-solution';

/**
 * Cấu hình riêng cho Ant Colony Optimization.
 */
export interface ACOConfig extends SolverConfig {
  /** Số ant (thường = N hoặc 2×N) */
  antCount?: number;
  /** Số iteration tối đa */
  maxIterations?: number;
  /** α — mức độ quan trọng của pheromone */
  alpha?: number;
  /** β — mức độ quan trọng của heuristic (1/distance) */
  beta?: number;
  /** ρ — tỉ lệ bay hơi pheromone mỗi iteration */
  evaporationRate?: number;
  /** Q — lượng pheromone ant để lại trên edge (tỉ lệ với 1/tour_length) */
  pheromoneDeposit?: number;
  /** Có kết hợp 2-opt local search sau mỗi iteration không (hybrid) */
  useLocalSearch?: boolean;
  /** Variant: Ant System (AS) hoặc Max-Min Ant System (MMAS) */
  variant?: 'AS' | 'MMAS';
}

/**
 * Ant Colony Optimization + 2-opt Local Search hybrid.
 *
 * Đây là THUẬT TOÁN CHÍNH của đề tài.
 *
 * Thuật toán:
 *   1. Khởi tạo pheromone τ_ij = τ_0 cho mọi edge
 *   2. Lặp qua maxIterations:
 *      a. Mỗi ant xây dựng tour:
 *         - Bắt đầu từ depot
 *         - Chọn customer kế tiếp theo xác suất:
 *           P(j | i) = (τ_ij^α × η_ij^β) / Σ(τ_ik^α × η_ik^β)
 *         - η_ij = 1 / distance_ij (heuristic thông tin)
 *      b. Áp dụng 2-opt local search cho tour vừa sinh (hybrid)
 *      c. Đánh giá tour, cập nhật best-so-far
 *      d. Update pheromone:
 *         - Bay hơi: τ_ij ← (1-ρ) × τ_ij
 *         - Deposit: ant có tour tốt để lại Q / tour_length lên edge
 *   3. Trả về best-so-far
 *
 * MMAS variant thêm:
 *   - Chỉ best ant deposit pheromone
 *   - Giới hạn τ ∈ [τ_min, τ_max] để tránh stagnation
 *
 * TODO Week 3:
 *   - Day 15-17: Implement Ant System cơ bản
 *   - Day 17-18: Nâng cấp MMAS
 *   - Day 18-19: Integrate 2-opt sau mỗi construct
 *   - Day 19-20: Parameter tuning
 */
@Injectable()
export class AntColonySolver extends TSPTWSolver {
  readonly name = 'aco-2opt-hybrid';

  solve(instance: TSPTWInstance, config?: ACOConfig): Promise<TSPTWSolution> {
    void instance;
    void config;
    // TODO Week 3: Implement ACO + 2-opt hybrid (core của báo cáo)
    return Promise.resolve(emptySolution(this.name));
  }
}
