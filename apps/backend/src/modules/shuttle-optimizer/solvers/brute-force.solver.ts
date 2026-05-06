import { Injectable, Logger } from '@nestjs/common';
import { TSPTWSolver, SolverConfig } from './solver.interface';
import { TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution, emptySolution } from '../models/tsptw-solution';
import { isLate } from '../models/time-window';

/**
 * Brute Force solver — Held-Karp Dynamic Programming.
 *
 * Vai trò: GROUND TRUTH (cận dưới quãng đường tối ưu).
 * Tất cả heuristic/metaheuristic so với solver này để tính optimality gap.
 *
 * --- Thuật toán Held-Karp ---
 *
 * State:
 *   dp[S][i] = trạng thái tốt nhất "đã thăm tập S, đang ở customer i"
 *            = { cost, time, prev } trong đó
 *              cost = tổng quãng đường từ depot đến i theo path tối ưu
 *              time = giờ rời customer i (sau service)
 *              prev = customer trước i trên path tối ưu (-1 nếu prev là depot)
 *
 * Transition:
 *   ∀ S, ∀ i ∈ S, ∀ j ∉ S:
 *     newCost = dp[S][i].cost + distance[i+1][j+1]
 *     arrival_j = dp[S][i].time + duration[i+1][j+1]
 *     depart_j  = max(arrival_j, customers[j].earliest) + serviceTime
 *     dp[S∪{j}][j] = min(dp[S∪{j}][j], (newCost, depart_j))
 *
 * Base: dp[{i}][i] = { cost: distance[0][i+1], time: depart_i, prev: -1 }
 *
 * Final: min_{i ∈ full} (dp[full][i].cost + distance[i+1][0])
 *
 * --- Lưu ý về time window ---
 *
 * Solver này tối ưu DISTANCE, vẫn cho phép arrival > latest (đếm violation).
 * Lý do: nhất quán với GreedySolver (cùng thước đo so sánh). Nếu cần tìm
 * NGHIỆM FEASIBLE TỐI ƯU, cần Pareto DP giữ cả cặp (cost, time) — chưa làm.
 *
 * --- Phức tạp ---
 *
 *   Thời gian: O(N² · 2^N)
 *   Bộ nhớ:   O(N · 2^N)
 *
 * Bảng tham khảo (laptop ~3GHz):
 *   N=10  →  ~10K states   ~50ms
 *   N=12  →  ~50K states   ~300ms
 *   N=15  →  ~500K states  ~3s
 *   N=18  →  ~5M states    ~30s
 *   N=20  → 20M+ states    > 1 phút
 *
 * Mặc định MAX_N = 18 — vượt sẽ throw để tránh treo server.
 */
@Injectable()
export class BruteForceSolver extends TSPTWSolver {
  private readonly logger = new Logger(BruteForceSolver.name);

  readonly name = 'brute-force';

  /** Giới hạn N để tránh memory blowup. 2^20 × 20 ≈ 20M cell × 24B ≈ 500MB. */
  private static readonly MAX_N = 18;

  solve(
    instance: TSPTWInstance,
    config?: SolverConfig,
  ): Promise<TSPTWSolution> {
    void config;
    const start = Date.now();
    const n = instance.customers.length;

    if (n === 0) {
      return Promise.resolve(emptySolution(this.name));
    }
    if (n > BruteForceSolver.MAX_N) {
      return Promise.reject(
        new Error(
          `BruteForceSolver chỉ hỗ trợ N ≤ ${BruteForceSolver.MAX_N} (yêu cầu N=${n}). ` +
            `Dùng heuristic solver (greedy/2-opt/SA/ACO) cho instance lớn hơn.`,
        ),
      );
    }

    const distance = instance.distanceMatrix;
    const duration = instance.durationMatrix;
    const customers = instance.customers;
    const fullSet = (1 << n) - 1;
    const numStates = 1 << n;

    /**
     * Lưu state DP bằng 3 mảng song song flat (tốt cho cache + GC).
     * Index: S × n + i.
     * cost = Infinity → state chưa đạt tới.
     */
    const cost = new Float64Array(numStates * n).fill(Infinity);
    const time = new Float64Array(numStates * n);
    const prev = new Int8Array(numStates * n).fill(-1);

    // Base case: depot → customer i
    for (let i = 0; i < n; i++) {
      const travel = duration[0][i + 1];
      const arrival = instance.depotStartTime + travel;
      const depart =
        Math.max(arrival, customers[i].timeWindow.earliest) +
        customers[i].serviceTime;
      const idx = (1 << i) * n + i;
      cost[idx] = distance[0][i + 1];
      time[idx] = depart;
      // prev[idx] = -1 (depot, đã default)
    }

    // DP transition
    for (let S = 1; S < numStates; S++) {
      for (let i = 0; i < n; i++) {
        if ((S & (1 << i)) === 0) continue;
        const idxI = S * n + i;
        const c = cost[idxI];
        if (c === Infinity) continue;

        const t = time[idxI];

        // Mở rộng đến mọi j chưa thăm
        for (let j = 0; j < n; j++) {
          if (S & (1 << j)) continue;
          const newCost = c + distance[i + 1][j + 1];
          const newS = S | (1 << j);
          const idxJ = newS * n + j;

          if (newCost < cost[idxJ]) {
            const arrivalJ = t + duration[i + 1][j + 1];
            const departJ =
              Math.max(arrivalJ, customers[j].timeWindow.earliest) +
              customers[j].serviceTime;
            cost[idxJ] = newCost;
            time[idxJ] = departJ;
            prev[idxJ] = i;
          }
        }
      }
    }

    // Tìm endpoint i tối ưu cho leg cuối i → depot
    let bestCost = Infinity;
    let bestEnd = -1;
    for (let i = 0; i < n; i++) {
      const idx = fullSet * n + i;
      if (cost[idx] === Infinity) continue;
      const total = cost[idx] + distance[i + 1][0];
      if (total < bestCost) {
        bestCost = total;
        bestEnd = i;
      }
    }

    if (bestEnd === -1) {
      // Không có path khả thi (lý thuyết không xảy ra với matrix complete)
      this.logger.warn(`No DP path found for N=${n}`);
      return Promise.resolve(emptySolution(this.name));
    }

    // Truy vết route: i ← prev[S][i], xoá i khỏi S, lặp đến khi prev = -1
    const route: number[] = [];
    let curEnd = bestEnd;
    let curS = fullSet;
    while (curEnd !== -1) {
      route.unshift(curEnd);
      const idx = curS * n + curEnd;
      const p = prev[idx];
      curS ^= 1 << curEnd;
      curEnd = p;
    }

    // Replay path để tính arrivalTimes thực + đếm violation (vì DP store cost
    // không track violation — không nhất thiết trùng với "fewest violations" path,
    // nhưng đó là trade-off đã document ở phần header)
    let curTime = instance.depotStartTime;
    let lastMatrixIdx = 0;
    const arrivalTimes: number[] = [];
    let violationCount = 0;

    for (const customerIdx of route) {
      const matrixIdx = customerIdx + 1;
      const travel = duration[lastMatrixIdx][matrixIdx];
      const arrival = curTime + travel;
      arrivalTimes.push(arrival);
      if (isLate(arrival, customers[customerIdx].timeWindow)) {
        violationCount++;
      }
      curTime =
        Math.max(arrival, customers[customerIdx].timeWindow.earliest) +
        customers[customerIdx].serviceTime;
      lastMatrixIdx = matrixIdx;
    }

    // Leg cuối về depot
    const returnTravel = duration[lastMatrixIdx][0];
    const totalDuration = curTime + returnTravel - instance.depotStartTime;

    return Promise.resolve({
      route,
      totalDistance: Math.round(bestCost * 100) / 100,
      totalDuration: Math.round(totalDuration * 10) / 10,
      isFeasible: violationCount === 0,
      violationCount,
      arrivalTimes,
      solverName: this.name,
      runtimeMs: Date.now() - start,
    });
  }
}
