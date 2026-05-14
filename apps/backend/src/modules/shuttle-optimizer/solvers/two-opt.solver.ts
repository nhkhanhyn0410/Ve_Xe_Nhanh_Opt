import { Injectable, Logger } from '@nestjs/common';
import { TSPTWSolver, SolverConfig } from './solver.interface';
import { endDepotMatrixIdx, TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution, emptySolution } from '../models/tsptw-solution';
import { GreedySolver } from './greedy.solver';
import { isLate } from '../models/time-window';

/**
 * Đánh giá 1 route — phục vụ acceptance check trong vòng lặp 2-opt.
 */
interface RouteEval {
  distance: number;
  violations: number;
  totalDuration: number;
  arrivalTimes: number[];
}

/**
 * 2-opt Local Search solver.
 *
 * --- Thuật toán ---
 *
 *   1) Khởi tạo nghiệm từ GreedySolver (đảm bảo solver này luôn ≥ Greedy).
 *   2) Vòng lặp:
 *      Với mọi cặp chỉ số (i, j), 0 ≤ i < j ≤ N-1:
 *        a) Đảo đoạn route[i..j] tại chỗ
 *        b) Đánh giá lại nghiệm
 *        c) Nếu tốt hơn → giữ; nếu không → đảo lại để revert
 *      First-improvement: nhận chỉnh sửa đầu tiên rồi restart sweep.
 *   3) Dừng khi 1 lượt sweep không tìm được cải thiện nào → local optimum.
 *
 * --- Tiêu chuẩn "tốt hơn" (lex order) ---
 *
 *   (violations_new, distance_new)  <  (violations_old, distance_old)
 *
 *   Tức là ƯU TIÊN giảm số vi phạm trước, sau đó mới đến distance.
 *   → Nếu greedy ra INFEASIBLE, 2-opt sẽ cố gắng "cứu" về FEASIBLE
 *     ngay cả khi distance tăng.
 *
 * --- Phức tạp ---
 *
 *   Mỗi sweep: O(N²) cặp × O(N) re-evaluate = O(N³)
 *   Số sweep: thường vài chục, tối đa hữu hạn (mỗi accept giảm strict)
 *
 *   N=10: ~1ms     N=20: ~50ms     N=50: ~5s
 *
 * --- Vai trò ---
 *
 *   - Đứng riêng: baseline local search, beat được greedy
 *   - Là hàng phụ trong ACO + 2-opt hybrid (W3): refine top-K ant mỗi vòng
 *
 * --- Lưu ý quan trọng ---
 *
 *   2-opt CHỈ TÌM LOCAL OPTIMUM. Không đảm bảo global, không thoát được
 *   khỏi cực tiểu cục bộ. Đó là lý do cần SA (W2) và ACO (W3) — các
 *   thuật toán có cơ chế thoát local.
 */
@Injectable()
export class TwoOptSolver extends TSPTWSolver {
  private readonly logger = new Logger(TwoOptSolver.name);

  readonly name = 'two-opt';

  /** Giới hạn lượt sweep tối đa — defensive (lý thuyết luôn hữu hạn). */
  private static readonly MAX_SWEEPS = 1000;

  /** Default time limit (ms) khi config.timeLimitMs không truyền */
  private static readonly DEFAULT_TIME_LIMIT_MS = 5000;

  constructor(private readonly greedy: GreedySolver) {
    super();
  }

  async solve(
    instance: TSPTWInstance,
    config?: SolverConfig,
  ): Promise<TSPTWSolution> {
    const start = Date.now();
    const n = instance.customers.length;

    if (n === 0) {
      return emptySolution(this.name);
    }

    // Khởi tạo từ Greedy → delegate core logic cho refineRoute
    const greedySol = await this.greedy.solve(instance);
    return this.refineRoute(instance, greedySol.route, {
      ...config,
      _startTime: start,
    });
  }

  /**
   * Refine 1 route bất kỳ bằng 2-Opt local search.
   *
   * Public để các solver khác (ACO+2opt hybrid) dùng làm subroutine.
   * Không gọi Greedy, chỉ chạy local search trên `initialRoute` truyền vào.
   *
   * @param instance
   * @param initialRoute thứ tự customer 0..N-1
   * @param options config + (internal) _startTime để tính runtime đúng khi
   *                được wrap bởi `solve()`
   */
  refineRoute(
    instance: TSPTWInstance,
    initialRoute: readonly number[],
    options?: SolverConfig & { _startTime?: number },
  ): TSPTWSolution {
    const start = options?._startTime ?? Date.now();
    const timeLimit =
      options?.timeLimitMs ?? TwoOptSolver.DEFAULT_TIME_LIMIT_MS;
    const verbose = options?.verbose ?? false;
    const n = instance.customers.length;

    if (n === 0) {
      return emptySolution(this.name);
    }

    const route = [...initialRoute];
    let evalNow = this.evaluate(route, instance);

    if (n < 2) {
      return this.toSolution(route, evalNow, Date.now() - start);
    }

    let sweep = 0;
    let totalAccepts = 0;
    let improved = true;

    while (improved && sweep < TwoOptSolver.MAX_SWEEPS) {
      improved = false;
      sweep++;

      if (Date.now() - start > timeLimit) {
        if (verbose)
          this.logger.warn(
            `${this.name}: hit time limit ${timeLimit}ms after ${sweep} sweeps`,
          );
        break;
      }

      outer: for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          this.reverseSegment(route, i, j);
          const newEval = this.evaluate(route, instance);

          if (this.isBetter(newEval, evalNow)) {
            evalNow = newEval;
            improved = true;
            totalAccepts++;
            break outer;
          } else {
            this.reverseSegment(route, i, j);
          }
        }
      }
    }

    if (verbose) {
      this.logger.log(
        `${this.name}: ${sweep} sweeps, ${totalAccepts} accepts, ` +
          `final=(viol=${evalNow.violations}, d=${evalNow.distance.toFixed(2)}km)`,
      );
    }

    return this.toSolution(route, evalNow, Date.now() - start);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  /**
   * Đảo ngược tại chỗ đoạn `arr[lo..hi]` (cả 2 đầu mút).
   * Gọi 2 lần liên tiếp = identity (dùng để revert sau khi check).
   */
  private reverseSegment(arr: number[], lo: number, hi: number): void {
    while (lo < hi) {
      const tmp = arr[lo];
      arr[lo] = arr[hi];
      arr[hi] = tmp;
      lo++;
      hi--;
    }
  }

  /**
   * Replay route từ depot để tính distance, arrival times, violations.
   *
   * Phải gọi mỗi lần check 2-opt move vì time window làm cho cost không
   * tách rời được (waiting time phụ thuộc thứ tự).
   */
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
    let lastMatrix = 0; // depot
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

    // Leg cuối đến depot kết thúc
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

  /**
   * `a` tốt hơn `b` theo lex order (violations, distance).
   * Tolerance 1e-9 cho distance để tránh thrashing do sai số float.
   */
  private isBetter(a: RouteEval, b: RouteEval): boolean {
    if (a.violations < b.violations) return true;
    if (a.violations > b.violations) return false;
    return a.distance < b.distance - 1e-9;
  }

  /** Chuyển RouteEval → TSPTWSolution. */
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
