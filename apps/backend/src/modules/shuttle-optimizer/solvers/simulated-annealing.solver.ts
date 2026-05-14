import { Injectable, Logger } from '@nestjs/common';
import { TSPTWSolver, SolverConfig } from './solver.interface';
import { endDepotMatrixIdx, TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution, emptySolution } from '../models/tsptw-solution';
import { GreedySolver } from './greedy.solver';
import { SeededRandom } from '../models/seeded-random';
import { isLate } from '../models/time-window';

/**
 * Cấu hình riêng cho Simulated Annealing.
 */
export interface SAConfig extends SolverConfig {
  /** Nhiệt độ ban đầu. Lớn → accept nhiều worse moves đầu. Default 100. */
  initialTemperature?: number;
  /** Nhiệt độ dừng. Default 0.01. */
  minTemperature?: number;
  /** Tỉ lệ làm nguội cho geometric: T = T × coolingRate. Default 0.95. */
  coolingRate?: number;
  /** Số iteration tại mỗi mức nhiệt độ. Default 100. */
  iterationsPerTemperature?: number;
  /** Loại cooling schedule. Default 'geometric'. */
  coolingSchedule?: 'geometric' | 'linear' | 'logarithmic';
}

/** Đánh giá 1 route — cho cost scalar. */
interface RouteEval {
  distance: number;
  violations: number;
  totalDuration: number;
  arrivalTimes: number[];
}

/** 2 loại move neighborhood SA dùng. Cả 2 đều là involution (apply 2 lần = identity). */
type Move =
  | { type: 'swap'; i: number; j: number }
  | { type: 'reverse'; i: number; j: number };

/**
 * Simulated Annealing solver.
 *
 * --- Thuật toán ---
 *
 *   1) Khởi tạo: nghiệm từ GreedySolver
 *   2) Tại mỗi temperature step:
 *      Lặp K lần (iterationsPerTemperature):
 *        - Sinh move ngẫu nhiên: swap 2 customer HOẶC reverse đoạn (2-opt)
 *        - Apply in-place, đánh giá lại
 *        - Δ = cost(new) - cost(current)
 *        - Accept nếu Δ < 0; nếu Δ ≥ 0 → accept với P = exp(-Δ/T)
 *        - Nếu reject → revert (vì move là involution, apply lại = undo)
 *      Sau K lần → giảm T theo schedule
 *   3) Dừng khi T < minT HOẶC vượt timeLimitMs
 *
 * --- Cost function (scalar) ---
 *
 *   cost = violations × 10000 + distance
 *
 *   Penalty lớn đảm bảo SA ưu tiên feasibility (1 vi phạm ≫ 10000km thừa).
 *   Vẫn dùng được trong exp(-Δ/T) vì là số thực có dấu.
 *
 * --- Cooling schedule ---
 *
 *   geometric:   T_{k+1} = T_k × rate            (mặc định, smooth)
 *   linear:      T_{k+1} = T_k - step            (decay nhanh giai đoạn cuối)
 *   logarithmic: T_k     = T_0 / log(k + 2)      (decay chậm, optimal theory)
 *
 * --- Điểm mạnh / yếu ---
 *
 *   ✓ Thoát local optimum nhờ accept worse moves
 *   ✓ Đơn giản, dễ implement, ít state
 *   ✗ Nhạy parameter (T_0, rate)
 *   ✗ Lãng phí so với hybrid (ACO + LS) — không học từ lịch sử
 *
 * --- Vai trò trong report ---
 *
 *   Solver "đối chứng" cho ACO. Cùng họ metaheuristic nhưng triết lý khác:
 *   - SA: 1 nghiệm hiện tại, random walk có hướng
 *   - ACO: nhiều ant song song, học qua pheromone
 */
@Injectable()
export class SimulatedAnnealingSolver extends TSPTWSolver {
  private readonly logger = new Logger(SimulatedAnnealingSolver.name);

  readonly name = 'simulated-annealing';

  /** Penalty cho mỗi vi phạm time window (phải lớn hơn mọi distance thực tế). */
  private static readonly VIOLATION_PENALTY = 10_000;

  /** Default time limit (ms) */
  private static readonly DEFAULT_TIME_LIMIT_MS = 5000;

  constructor(private readonly greedy: GreedySolver) {
    super();
  }

  async solve(
    instance: TSPTWInstance,
    config?: SAConfig,
  ): Promise<TSPTWSolution> {
    const start = Date.now();
    const n = instance.customers.length;

    if (n === 0) {
      return emptySolution(this.name);
    }

    // ─── Config ────────────────────────────────────────────────────────
    const T0 = config?.initialTemperature ?? 100;
    const minT = config?.minTemperature ?? 0.01;
    const coolingRate = config?.coolingRate ?? 0.95;
    const iterPerT = config?.iterationsPerTemperature ?? 100;
    const schedule = config?.coolingSchedule ?? 'geometric';
    const timeLimit =
      config?.timeLimitMs ?? SimulatedAnnealingSolver.DEFAULT_TIME_LIMIT_MS;
    const seed = config?.seed ?? Date.now();
    const verbose = config?.verbose ?? false;

    const rng = new SeededRandom(seed);

    // ─── Khởi tạo từ Greedy ────────────────────────────────────────────
    const greedySol = await this.greedy.solve(instance);
    const current = [...greedySol.route];
    let currentEval = this.evaluate(current, instance);
    let currentCost = this.cost(currentEval);

    let best = [...current];
    let bestEval = currentEval;
    let bestCost = currentCost;

    // Nếu N < 2 → không có neighborhood move → trả luôn nghiệm khởi tạo
    if (n < 2) {
      return this.toSolution(best, bestEval, Date.now() - start);
    }

    // ─── Vòng lặp SA ───────────────────────────────────────────────────
    let T = T0;
    let step = 0;
    let totalIter = 0;
    let totalAccepts = 0;
    let totalImprovements = 0;

    while (T > minT) {
      step++;

      if (Date.now() - start > timeLimit) {
        if (verbose)
          this.logger.warn(
            `${this.name}: hit time limit ${timeLimit}ms at step ${step}`,
          );
        break;
      }

      for (let it = 0; it < iterPerT; it++) {
        totalIter++;
        const move = this.generateMove(current.length, rng);

        // Apply move in-place
        this.applyMove(current, move);
        const newEval = this.evaluate(current, instance);
        const newCost = this.cost(newEval);
        const delta = newCost - currentCost;

        const accept = delta < 0 || rng.next() < Math.exp(-delta / T);

        if (accept) {
          currentEval = newEval;
          currentCost = newCost;
          totalAccepts++;

          if (newCost < bestCost) {
            best = [...current];
            bestEval = newEval;
            bestCost = newCost;
            totalImprovements++;
          }
        } else {
          this.applyMove(current, move); // revert (move là involution)
        }
      }

      T = this.cool(T0, T, step, coolingRate, schedule);
    }

    if (verbose) {
      this.logger.log(
        `${this.name}: ${step} cooling steps, ${totalIter} iter, ` +
          `${totalAccepts} accepts (${((100 * totalAccepts) / totalIter).toFixed(1)}%), ` +
          `${totalImprovements} improvements, final=(viol=${bestEval.violations}, ` +
          `d=${bestEval.distance.toFixed(2)}km)`,
      );
    }

    return this.toSolution(best, bestEval, Date.now() - start);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  /**
   * Sinh move ngẫu nhiên: 50% swap, 50% reverse (2-opt).
   * Cả 2 đều là involution → apply 2 lần = identity → dễ revert.
   */
  private generateMove(n: number, rng: SeededRandom): Move {
    if (rng.next() < 0.5) {
      const i = rng.randInt(0, n - 1);
      let j = rng.randInt(0, n - 1);
      while (j === i) j = rng.randInt(0, n - 1);
      return { type: 'swap', i, j };
    } else {
      const i = rng.randInt(0, n - 2);
      const j = rng.randInt(i + 1, n - 1);
      return { type: 'reverse', i, j };
    }
  }

  private applyMove(route: number[], move: Move): void {
    if (move.type === 'swap') {
      const tmp = route[move.i];
      route[move.i] = route[move.j];
      route[move.j] = tmp;
    } else {
      let lo = move.i;
      let hi = move.j;
      while (lo < hi) {
        const tmp = route[lo];
        route[lo] = route[hi];
        route[hi] = tmp;
        lo++;
        hi--;
      }
    }
  }

  /**
   * Hàm cool theo schedule:
   *   - geometric:   T × rate
   *   - linear:      T - (T0 - minT) / 200       (200 steps để đi từ T0 → minT)
   *   - logarithmic: T0 / log(step + 2)
   */
  private cool(
    T0: number,
    T: number,
    step: number,
    rate: number,
    schedule: 'geometric' | 'linear' | 'logarithmic',
  ): number {
    switch (schedule) {
      case 'geometric':
        return T * rate;
      case 'linear':
        return T - (T0 - 0.01) / 200;
      case 'logarithmic':
        return T0 / Math.log(step + 2);
    }
  }

  /** Cost scalar — kết hợp violations và distance để feed vào exp(-Δ/T). */
  private cost(e: RouteEval): number {
    return (
      e.violations * SimulatedAnnealingSolver.VIOLATION_PENALTY + e.distance
    );
  }

  /** Replay route → distance, violations, arrival times. Giống TwoOpt. */
  private evaluate(route: number[], instance: TSPTWInstance): RouteEval {
    const n = route.length;
    if (n === 0) {
      return {
        distance: 0,
        violations: 0,
        totalDuration: 0,
        arrivalTimes: [],
      };
    }

    let distance = 0;
    let violations = 0;
    let curTime = instance.depotStartTime;
    let lastMatrix = 0;
    const arrivalTimes: number[] = new Array<number>(n);

    for (let i = 0; i < n; i++) {
      const customerIdx = route[i];
      const matrixIdx = customerIdx + 1;
      const travel = instance.durationMatrix[lastMatrix][matrixIdx];
      const arrival = curTime + travel;
      arrivalTimes[i] = arrival;

      const customer = instance.customers[customerIdx];
      if (isLate(arrival, customer.timeWindow)) {
        violations++;
      }

      distance += instance.distanceMatrix[lastMatrix][matrixIdx];
      curTime =
        Math.max(arrival, customer.timeWindow.earliest) + customer.serviceTime;
      lastMatrix = matrixIdx;
    }

    const endIdx = endDepotMatrixIdx(instance);
    distance += instance.distanceMatrix[lastMatrix][endIdx];
    const returnTravel = instance.durationMatrix[lastMatrix][endIdx];
    const depotArrivalTime = curTime + returnTravel;
    if (depotArrivalTime > instance.depotEndTime) {
      violations++;
    }
    const totalDuration = depotArrivalTime - instance.depotStartTime;

    return { distance, violations, totalDuration, arrivalTimes };
  }

  private toSolution(
    route: number[],
    e: RouteEval,
    runtimeMs: number,
  ): TSPTWSolution {
    return {
      route: [...route],
      totalDistance: Math.round(e.distance * 100) / 100,
      totalDuration: Math.round(e.totalDuration * 10) / 10,
      isFeasible: e.violations === 0,
      violationCount: e.violations,
      arrivalTimes: e.arrivalTimes,
      solverName: this.name,
      runtimeMs,
    };
  }
}
