import { Injectable, Logger } from '@nestjs/common';
import { TSPTWSolver, SolverConfig } from './solver.interface';
import { TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution, emptySolution } from '../models/tsptw-solution';
import { GreedySolver } from './greedy.solver';
import { TwoOptSolver } from './two-opt.solver';
import { SeededRandom } from '../models/seeded-random';
import { isLate } from '../models/time-window';

/**
 * Cấu hình ACO + 2-Opt.
 */
export interface ACOConfig extends SolverConfig {
  /** Số ant mỗi vòng. Default = N (tối thiểu 10). */
  antCount?: number;
  /** Số vòng lặp tối đa. Default 100. */
  maxIterations?: number;
  /** α — trọng số pheromone. Default 1.0. */
  alpha?: number;
  /** β — trọng số heuristic (1/distance). Default 3.0. */
  beta?: number;
  /** ρ — tốc độ bay hơi pheromone mỗi vòng. Default 0.1. */
  evaporationRate?: number;
  /** Q — lượng pheromone mỗi ant deposit. Default 100. */
  pheromoneDeposit?: number;
  /** Có refine 2-opt trên top-K ant không. Default true. */
  useLocalSearch?: boolean;
  /** 2-opt sẽ áp dụng trên top-K ant tốt nhất mỗi vòng. Default 3. */
  twoOptOnTopK?: number;
  /**
   * Variant:
   *   - 'AS'   (Ant System cơ bản, tất cả ant deposit)
   *   - 'MMAS' (Max-Min Ant System, chỉ best ant deposit, kẹp τ ∈ [τ_min, τ_max])
   * Default 'MMAS' — robust hơn cho TSPTW.
   */
  variant?: 'AS' | 'MMAS';
}

/** Đánh giá 1 route. */
interface RouteEval {
  distance: number;
  violations: number;
  totalDuration: number;
  arrivalTimes: number[];
  cost: number; // = violations × PENALTY + distance
}

/**
 * Ant Colony Optimization + 2-Opt local search hybrid.
 *
 * ── ĐÂY LÀ THUẬT TOÁN CHÍNH CỦA ĐỀ TÀI ───────────────────────────────
 *
 * Tổng quan:
 *   Mô phỏng đàn kiến tìm đường ngắn nhất tới mồi. Mỗi vòng, M con kiến
 *   xây N tour song song dựa trên pheromone τ tích lũy + heuristic 1/d.
 *   Các tour tốt nhất được tinh chỉnh bằng 2-opt local search (HYBRID),
 *   rồi đóng góp pheromone cho vòng sau.
 *
 *   Cơ chế cốt lõi:
 *     - PHEROMONE: kiến "học" qua thế hệ — đường tốt được củng cố
 *     - HEURISTIC: thiên vị cạnh ngắn, biết trước
 *     - EVAPORATION: quên bớt → tránh kẹt sớm tại local optimum
 *     - LOCAL SEARCH: 2-opt làm sạch noise của random walk
 *
 * ── Vòng lặp ────────────────────────────────────────────────────────
 *
 *   1) Khởi tạo:
 *      - τ_0 = 1 / (N × greedy_cost)   ← chọn để pheromone đều ban đầu
 *      - η_ij = 1 / (distance_ij + ε)  ← heuristic cố định
 *      - best ← greedy_solution
 *
 *   2) Lặp maxIterations vòng:
 *      a) Mỗi ant trong M ants:
 *         - Bắt đầu tại depot
 *         - Khi đang ở i, chọn j chưa thăm với xác suất:
 *
 *              p(j | i) = (τ_ij)^α × (η_ij)^β / Σ_k (τ_ik)^α × (η_ik)^β
 *
 *         (Roulette wheel selection)
 *      b) Sort ant theo cost = violations × PENALTY + distance
 *      c) Hybrid: chạy 2-Opt trên top-K ant tốt nhất
 *      d) Cập nhật globalBest nếu top-1 tốt hơn
 *      e) Update pheromone:
 *         - Bay hơi: τ ← (1 - ρ) × τ
 *         - Deposit:
 *             AS:   tất cả ant deposit Q / cost lên cạnh tour mình đi
 *             MMAS: CHỈ globalBest deposit; sau đó kẹp τ ∈ [τ_min, τ_max]
 *
 *   3) Trả globalBest sau khi vòng cuối hoàn tất.
 *
 * ── MMAS τ-bounds (Stützle & Hoos 2000) ─────────────────────────────
 *
 *   τ_max = 1 / (ρ × bestCost)
 *   τ_min = τ_max × (1 - p_best^(1/N)) / ((avgChoices - 1) × p_best^(1/N))
 *
 *   Default p_best = 0.05 → 5% xác suất kiến tốt nhất xây lại đúng tour
 *   từ pheromone hiện tại.
 *
 * ── Tham khảo ───────────────────────────────────────────────────────
 *
 *   - Dorigo, Maniezzo & Colorni (1996), "Ant System"
 *   - Stützle & Hoos (2000), "Max-Min Ant System"
 *   - Dorigo & Stützle (2004), "Ant Colony Optimization" (sách)
 */
@Injectable()
export class AntColonySolver extends TSPTWSolver {
  private readonly logger = new Logger(AntColonySolver.name);

  readonly name = 'aco-2opt-hybrid';

  /** Penalty cho mỗi vi phạm TW (matching SA + OR-Tools). */
  private static readonly VIOLATION_PENALTY = 10_000;

  /** Epsilon để tránh chia 0 trong heuristic. */
  private static readonly EPSILON = 1e-6;

  /** Default time limit (ms). */
  private static readonly DEFAULT_TIME_LIMIT_MS = 10_000;

  constructor(
    private readonly greedy: GreedySolver,
    private readonly twoOpt: TwoOptSolver,
  ) {
    super();
  }

  async solve(
    instance: TSPTWInstance,
    config?: ACOConfig,
  ): Promise<TSPTWSolution> {
    const start = Date.now();
    const n = instance.customers.length;

    if (n === 0) {
      return emptySolution(this.name);
    }

    // ─── Config ────────────────────────────────────────────────────────
    const antCount = config?.antCount ?? Math.max(10, n);
    const maxIter = config?.maxIterations ?? 100;
    const alpha = config?.alpha ?? 1.0;
    const beta = config?.beta ?? 3.0;
    const rho = config?.evaporationRate ?? 0.1;
    const Q = config?.pheromoneDeposit ?? 100;
    const useLS = config?.useLocalSearch ?? true;
    const topK = config?.twoOptOnTopK ?? 3;
    const variant = config?.variant ?? 'MMAS';
    const timeLimit =
      config?.timeLimitMs ?? AntColonySolver.DEFAULT_TIME_LIMIT_MS;
    const seed = config?.seed ?? Date.now();
    const verbose = config?.verbose ?? false;

    const rng = new SeededRandom(seed);

    // ─── Khởi tạo: Greedy seed + pheromone + heuristic ─────────────────
    const greedySol = await this.greedy.solve(instance);
    const greedyEval = this.evaluate(greedySol.route, instance);

    let bestRoute = [...greedySol.route];
    let bestEval = greedyEval;

    if (n < 2) {
      return this.toSolution(bestRoute, bestEval, Date.now() - start);
    }

    const numNodes = n + 1; // depot + N customers
    const tau0 = 1 / (n * Math.max(1, greedyEval.cost));
    const tau = this.makeMatrix(numNodes, tau0);
    const eta = this.computeHeuristic(instance);

    // MMAS bounds — sẽ update mỗi khi best đổi
    let tauMax = 1 / (rho * Math.max(1, bestEval.cost));
    let tauMin = tauMax / (2 * n); // xấp xỉ đơn giản

    // ─── Vòng lặp ACO ─────────────────────────────────────────────────
    let iter = 0;
    let lastImprovementIter = 0;

    while (iter < maxIter) {
      iter++;
      if (Date.now() - start > timeLimit) {
        if (verbose)
          this.logger.warn(
            `${this.name}: hit time limit ${timeLimit}ms at iter ${iter}`,
          );
        break;
      }

      // Mỗi ant xây 1 tour
      const ants: { route: number[]; eval: RouteEval }[] = [];
      for (let a = 0; a < antCount; a++) {
        const route = this.constructAntTour(
          instance,
          tau,
          eta,
          alpha,
          beta,
          rng,
        );
        ants.push({ route, eval: this.evaluate(route, instance) });
      }

      // Sort theo cost
      ants.sort((a, b) => a.eval.cost - b.eval.cost);

      // 2-Opt refine top-K (HYBRID)
      if (useLS) {
        const k = Math.min(topK, ants.length);
        for (let i = 0; i < k; i++) {
          const refined = this.twoOpt.refineRoute(instance, ants[i].route, {
            timeLimitMs: 500, // budget nhỏ vì gọi nhiều lần
          });
          ants[i] = {
            route: refined.route,
            eval: this.evaluate(refined.route, instance),
          };
        }
        // Re-sort sau refine
        ants.sort((a, b) => a.eval.cost - b.eval.cost);
      }

      // Update global best
      if (ants[0].eval.cost < bestEval.cost) {
        bestRoute = [...ants[0].route];
        bestEval = ants[0].eval;
        lastImprovementIter = iter;
        tauMax = 1 / (rho * Math.max(1, bestEval.cost));
        tauMin = tauMax / (2 * n);
      }

      // ─── Pheromone update ───────────────────────────────────────────
      // Evaporation
      for (let i = 0; i < numNodes; i++) {
        for (let j = 0; j < numNodes; j++) {
          tau[i][j] *= 1 - rho;
        }
      }

      // Deposit
      if (variant === 'AS') {
        // Tất cả ant deposit
        for (const ant of ants) {
          const delta = Q / Math.max(1, ant.eval.cost);
          this.depositPheromone(tau, ant.route, delta);
        }
      } else {
        // MMAS — chỉ globalBest deposit (mỗi vòng)
        const delta = Q / Math.max(1, bestEval.cost);
        this.depositPheromone(tau, bestRoute, delta);

        // Clamp τ ∈ [τ_min, τ_max]
        for (let i = 0; i < numNodes; i++) {
          for (let j = 0; j < numNodes; j++) {
            if (tau[i][j] > tauMax) tau[i][j] = tauMax;
            else if (tau[i][j] < tauMin) tau[i][j] = tauMin;
          }
        }
      }

      if (verbose && iter % 10 === 0) {
        this.logger.log(
          `iter ${iter}/${maxIter}: best (viol=${bestEval.violations}, ` +
            `d=${bestEval.distance.toFixed(2)}km), ` +
            `top-ant d=${ants[0].eval.distance.toFixed(2)}km`,
        );
      }
    }

    if (verbose) {
      this.logger.log(
        `${this.name}: ${iter} iter, last improvement at iter ${lastImprovementIter}, ` +
          `final=(viol=${bestEval.violations}, d=${bestEval.distance.toFixed(2)}km)`,
      );
    }

    return this.toSolution(bestRoute, bestEval, Date.now() - start);
  }

  // ─── Ant construction (roulette wheel selection) ──────────────────────

  /**
   * 1 ant xây 1 tour: bắt đầu từ depot, mỗi bước chọn customer chưa thăm
   * theo xác suất p(j|i) = (τ_ij^α × η_ij^β) / Σ_k.
   */
  private constructAntTour(
    instance: TSPTWInstance,
    tau: number[][],
    eta: number[][],
    alpha: number,
    beta: number,
    rng: SeededRandom,
  ): number[] {
    const n = instance.customers.length;
    const visited = new Array<boolean>(n).fill(false);
    const route: number[] = [];

    let curMatrixIdx = 0; // depot

    for (let step = 0; step < n; step++) {
      // Tính weight cho từng customer chưa thăm
      let totalWeight = 0;
      const weights = new Array<number>(n).fill(0);

      for (let j = 0; j < n; j++) {
        if (visited[j]) continue;
        const matrixIdx = j + 1;
        const t = tau[curMatrixIdx][matrixIdx];
        const e = eta[curMatrixIdx][matrixIdx];
        const w = Math.pow(t, alpha) * Math.pow(e, beta);
        weights[j] = w;
        totalWeight += w;
      }

      // Edge case: tất cả weight = 0 (pheromone bị clamp xuống 0)
      // → chọn uniform random từ unvisited
      let chosen = -1;
      if (totalWeight <= 0) {
        const unvisited: number[] = [];
        for (let j = 0; j < n; j++) if (!visited[j]) unvisited.push(j);
        chosen = unvisited[rng.randInt(0, unvisited.length - 1)];
      } else {
        // Roulette wheel
        const r = rng.next() * totalWeight;
        let acc = 0;
        for (let j = 0; j < n; j++) {
          if (visited[j]) continue;
          acc += weights[j];
          if (acc >= r) {
            chosen = j;
            break;
          }
        }
        if (chosen === -1) {
          // Fallback (sai số float) — chọn customer chưa thăm cuối cùng
          for (let j = n - 1; j >= 0; j--) {
            if (!visited[j]) {
              chosen = j;
              break;
            }
          }
        }
      }

      visited[chosen] = true;
      route.push(chosen);
      curMatrixIdx = chosen + 1;
    }

    return route;
  }

  // ─── Pheromone helpers ────────────────────────────────────────────────

  /** Khởi tạo ma trận N×N với giá trị `value` đồng đều. */
  private makeMatrix(size: number, value: number): number[][] {
    const m: number[][] = new Array<number[]>(size);
    for (let i = 0; i < size; i++) {
      m[i] = new Array<number>(size).fill(value);
    }
    return m;
  }

  /** Heuristic η[i][j] = 1 / (distance[i][j] + ε). Không đổi theo iter. */
  private computeHeuristic(instance: TSPTWInstance): number[][] {
    const n = instance.distanceMatrix.length;
    const eta = this.makeMatrix(n, 0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        eta[i][j] =
          1 / (instance.distanceMatrix[i][j] + AntColonySolver.EPSILON);
      }
    }
    return eta;
  }

  /**
   * Đặt pheromone (đối xứng) lên các cạnh của 1 tour.
   * Tour gồm các cạnh: depot→r[0], r[i-1]→r[i] với i ≥ 1, r[N-1]→depot.
   */
  private depositPheromone(
    tau: number[][],
    route: number[],
    amount: number,
  ): void {
    if (route.length === 0) return;
    let prev = 0;
    for (const customerIdx of route) {
      const cur = customerIdx + 1;
      tau[prev][cur] += amount;
      tau[cur][prev] += amount; // đối xứng
      prev = cur;
    }
    // Leg cuối về depot
    tau[prev][0] += amount;
    tau[0][prev] += amount;
  }

  // ─── Evaluation ───────────────────────────────────────────────────────

  /** Replay route → distance, violations, totalDuration, arrival times + cost scalar. */
  private evaluate(
    route: readonly number[],
    instance: TSPTWInstance,
  ): RouteEval {
    const n = route.length;
    if (n === 0) {
      return {
        distance: 0,
        violations: 0,
        totalDuration: 0,
        arrivalTimes: [],
        cost: 0,
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

    distance += instance.distanceMatrix[lastMatrix][0];
    const returnTravel = instance.durationMatrix[lastMatrix][0];
    const totalDuration = curTime + returnTravel - instance.depotStartTime;
    const cost = violations * AntColonySolver.VIOLATION_PENALTY + distance;

    return { distance, violations, totalDuration, arrivalTimes, cost };
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
