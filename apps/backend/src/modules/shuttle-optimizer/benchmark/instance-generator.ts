import { Injectable } from '@nestjs/common';
import { TSPTWInstance } from '../models/tsptw-instance';

export interface GenerateConfig {
  /** Số customer */
  customerCount: number;
  /** Bán kính phân bố customer quanh depot (km) */
  radiusKm: number;
  /** Depot ở giữa area random nào (mặc định: trung tâm TPHCM) */
  depotCenter?: [number, number];
  /** Window width trung bình (phút) — customer có window càng hẹp càng khó */
  windowWidthMinutes?: number;
  /** Random seed để reproducible */
  seed?: number;
}

/**
 * Sinh TSPTWInstance ngẫu nhiên để benchmark.
 *
 * Các size khuyến nghị trong báo cáo:
 *   - N = 5, 10: brute force còn chạy được
 *   - N = 15, 20: greedy + 2-opt + SA
 *   - N = 30, 50, 100: chỉ ACO + OR-Tools
 *
 * Mỗi size nên sinh 10-30 instance để có statistical significance.
 *
 * TODO Week 1 Day 7: Implement.
 * Gợi ý:
 *   - Dùng OsrmDistanceMatrixService để có distance thực tế TPHCM
 *   - Window width từ Uniform(30, 120) phút
 *   - depotStartTime = 300 (5:00 sáng), depotEndTime = 420 (7:00)
 */
@Injectable()
export class InstanceGenerator {
  generate(config: GenerateConfig): Promise<TSPTWInstance> {
    void config;
    // TODO Week 1: Random customer trong bán kính + gọi OSRM + sinh time window
    return Promise.reject(new Error('Not implemented yet'));
  }
}
