import { Injectable } from '@nestjs/common';
import { TSPTWSolver, SolverConfig } from './solver.interface';
import { TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution } from '../models/tsptw-solution';
import { waitTime, isLate } from '../models/time-window';

/**
 * Greedy Nearest Neighbor solver — IMPLEMENTED.
 *
 * Thuật toán:
 *   1. Bắt đầu từ depot tại depotStartTime
 *   2. Mỗi bước: tìm customer chưa thăm có score = travelTime + waitTime nhỏ nhất
 *      (nearest + sớm nhất — tie-break tự nhiên theo time window)
 *   3. Di chuyển đến đó, nếu đến sớm thì chờ đến earliest, sau đó service
 *   4. Lặp đến khi hết customer
 *   5. Quay về depot, tính tổng distance
 *
 * Complexity: O(N²)
 * Vai trò: BASELINE — tất cả thuật toán khác phải beat được greedy.
 */
@Injectable()
export class GreedySolver extends TSPTWSolver {
  readonly name = 'greedy-nearest-neighbor';

  solve(
    instance: TSPTWInstance,
    config?: SolverConfig,
  ): Promise<TSPTWSolution> {
    void config;
    const start = Date.now();
    const n = instance.customers.length;

    const visited = new Set<number>();
    const route: number[] = [];
    const arrivalTimes: number[] = [];

    // currentNodeIdx: 0 = depot, 1..N = customers (theo distance matrix)
    let currentNodeIdx = 0;
    let currentTime = instance.depotStartTime;
    let totalDistance = 0;
    let violationCount = 0;

    while (visited.size < n) {
      let bestCustomerIdx = -1;
      let bestScore = Infinity;

      // Tìm customer chưa thăm có chi phí (travel + wait) nhỏ nhất
      for (let i = 0; i < n; i++) {
        if (visited.has(i)) continue;

        const matrixIdx = i + 1; // +1 vì index 0 là depot
        const travelMin = instance.durationMatrix[currentNodeIdx][matrixIdx];
        const arrival = currentTime + travelMin;
        const wait = waitTime(arrival, instance.customers[i].timeWindow);
        const score = travelMin + wait;

        if (score < bestScore) {
          bestScore = score;
          bestCustomerIdx = i;
        }
      }

      if (bestCustomerIdx === -1) break;

      const matrixIdx = bestCustomerIdx + 1;
      const travelMin = instance.durationMatrix[currentNodeIdx][matrixIdx];
      const arrival = currentTime + travelMin;
      const customer = instance.customers[bestCustomerIdx];

      if (isLate(arrival, customer.timeWindow)) {
        violationCount++;
      }

      // Nếu đến sớm hơn earliest → chờ
      const departTime =
        Math.max(arrival, customer.timeWindow.earliest) + customer.serviceTime;

      totalDistance += instance.distanceMatrix[currentNodeIdx][matrixIdx];
      currentTime = departTime;
      currentNodeIdx = matrixIdx;

      route.push(bestCustomerIdx);
      arrivalTimes.push(arrival);
      visited.add(bestCustomerIdx);
    }

    // Quay về depot
    totalDistance += instance.distanceMatrix[currentNodeIdx][0];
    const totalDuration = currentTime - instance.depotStartTime;

    return Promise.resolve({
      route,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration: Math.round(totalDuration),
      isFeasible: violationCount === 0,
      violationCount,
      arrivalTimes,
      solverName: this.name,
      runtimeMs: Date.now() - start,
    });
  }
}
