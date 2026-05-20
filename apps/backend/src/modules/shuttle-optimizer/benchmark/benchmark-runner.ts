import { Injectable, Logger } from '@nestjs/common';
import { TSPTWSolver, SolverConfig } from '../solvers/solver.interface';
import { TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution } from '../models/tsptw-solution';
import { InstanceGenerator, GenerateConfig } from './instance-generator';
import { GreedySolver } from '../solvers/greedy.solver';
import { BruteForceSolver } from '../solvers/brute-force.solver';
import { TwoOptSolver } from '../solvers/two-opt.solver';
import { SimulatedAnnealingSolver } from '../solvers/simulated-annealing.solver';
import { AntColonySolver } from '../solvers/ant-colony.solver';
import { OrToolsSolver } from '../solvers/or-tools.solver';

/**
 * 1 lần chạy: 1 solver × 1 instance × 1 seed.
 */
export interface BenchmarkRun {
  instanceId: string;
  /** N — số customer */
  n: number;
  /** Seed của random generator */
  seed: number;
  solverName: string;
  totalDistance: number;
  totalDuration: number;
  isFeasible: boolean;
  violationCount: number;
  runtimeMs: number;
  /** Gap % so với best-known (BF nếu N ≤ 15, OR-Tools fallback). null nếu không tính được. */
  optimalityGap: number | null;
}

/**
 * Thống kê tổng hợp cho 1 (N, solver).
 */
export interface BenchmarkAggregate {
  n: number;
  solverName: string;
  /** Số lần chạy (= seedCount) */
  runs: number;
  /** Quãng đường: best (min), mean, median, std */
  distanceBest: number;
  distanceMean: number;
  distanceMedian: number;
  distanceStd: number;
  /** Runtime (ms): mean, max */
  runtimeMean: number;
  runtimeMax: number;
  /** % feasibility — runs có violations=0 / total */
  feasibilityRate: number;
  /** Tổng vi phạm trung bình mỗi run */
  violationsMean: number;
  /** Optimality gap trung bình (%) — null nếu không có reference */
  gapMean: number | null;
}

/**
 * Cấu hình chạy benchmark batch.
 */
export interface BenchmarkConfig {
  /** Danh sách N để test. Default [5, 8, 10, 12]. */
  sizes?: number[];
  /** Danh sách seed cho mỗi size — kích thước = số runs/size. Default [1..5]. */
  seeds?: number[];
  /** Tên solver để chạy. Default tất cả 6 solver. */
  solverNames?: string[];
  /** Config thêm khi generate instance (giữ depot, radius, ...) */
  generateConfig?: Omit<GenerateConfig, 'customerCount' | 'seed'>;
  /** Per-solver config (timeLimit, alpha, ...) */
  solverConfig?: SolverConfig;
  /** Giới hạn N để brute-force còn chạy được (làm reference). Default 12. */
  maxBruteForceN?: number;
}

export interface BenchmarkReport {
  config: Required<BenchmarkConfig>;
  /** Mọi run chi tiết */
  runs: BenchmarkRun[];
  /** Tổng hợp theo (N, solver) */
  aggregates: BenchmarkAggregate[];
  /** Tổng số instance đã chạy */
  totalInstances: number;
  /** Tổng wall-clock time (ms) */
  totalRuntimeMs: number;
  /** Solver được chọn làm "best-known reference" cho mỗi N (để tính gap) */
  referenceBySize: Record<number, string>;
}

/**
 * BenchmarkRunner — chạy 6 solver × N instance size × M seed,
 * tổng hợp metrics theo (N, solver), export JSON.
 *
 * Thiết kế cho báo cáo môn AI:
 *   - Optimality gap (so với BruteForce trên N ≤ 12, OR-Tools fallback N lớn)
 *   - Feasibility rate (% instance giải feasible)
 *   - Runtime scaling theo N
 *   - Std distance → đánh giá độ ổn định metaheuristic
 *
 * Cách dùng:
 *   1. runDefault() — chạy mặc định, trả JSON đầy đủ
 *   2. runConfig(cfg) — tuỳ chỉnh sizes + seeds + solver
 */
@Injectable()
export class BenchmarkRunner {
  private readonly logger = new Logger(BenchmarkRunner.name);

  /** Tất cả solver đăng ký, lookup theo `name`. */
  private readonly solvers: Map<string, TSPTWSolver>;

  constructor(
    private readonly generator: InstanceGenerator,
    greedy: GreedySolver,
    bruteForce: BruteForceSolver,
    twoOpt: TwoOptSolver,
    sa: SimulatedAnnealingSolver,
    aco: AntColonySolver,
    orTools: OrToolsSolver,
  ) {
    this.solvers = new Map<string, TSPTWSolver>([
      [greedy.name, greedy],
      [bruteForce.name, bruteForce],
      [twoOpt.name, twoOpt],
      [sa.name, sa],
      [aco.name, aco],
      [orTools.name, orTools],
    ]);
  }

  /**
   * Chạy benchmark với config — entry point chính.
   */
  async runConfig(input?: BenchmarkConfig): Promise<BenchmarkReport> {
    const startWall = Date.now();
    const config = this.applyDefaults(input);

    this.logger.log(
      `Benchmark start: sizes=[${config.sizes.join(',')}], ` +
        `seeds=[${config.seeds.join(',')}], ` +
        `solvers=[${config.solverNames.join(',')}]`,
    );

    const allRuns: BenchmarkRun[] = [];
    const referenceBySize: Record<number, string> = {};

    for (const n of config.sizes) {
      // 1) Sinh instance cho mọi seed
      const instances: TSPTWInstance[] = [];
      for (const seed of config.seeds) {
        const inst = await this.generator.generate({
          customerCount: n,
          seed,
          ...config.generateConfig,
        });
        instances.push(inst);
      }

      // 2) Chọn reference solver để tính optimality gap cho size n
      const refName = this.pickReferenceSolver(n, config);
      referenceBySize[n] = refName;

      // 3) Chạy reference trước (sau dùng làm baseline)
      const refResults = new Map<string, TSPTWSolution>(); // key: instanceId
      const refSolver = this.solvers.get(refName);
      if (refSolver) {
        for (const inst of instances) {
          try {
            const sol = await this.runOnce(
              refSolver,
              inst,
              this.withInstanceSeed(config.solverConfig, inst),
            );
            refResults.set(inst.id, sol);
          } catch (e) {
            this.logger.warn(
              `Reference ${refName} lỗi trên ${inst.id}: ${(e as Error).message}`,
            );
          }
        }
      }

      // 4) Chạy mọi solver trong solverNames
      for (const solverName of config.solverNames) {
        const solver = this.solvers.get(solverName);
        if (!solver) {
          this.logger.warn(`Solver '${solverName}' không tồn tại, skip.`);
          continue;
        }

        for (const inst of instances) {
          try {
            // Re-use ref result nếu solver = reference (tiết kiệm)
            const sol =
              solverName === refName && refResults.has(inst.id)
                ? refResults.get(inst.id)!
                : await this.runOnce(
                    solver,
                    inst,
                    this.withInstanceSeed(config.solverConfig, inst),
                  );

            const ref = refResults.get(inst.id);
            const gap = this.computeGap(sol, ref);

            // Lấy seed từ instance.id format `gen-N{n}-r{r}-w{w}-s{seed}`
            const seed = this.extractSeed(inst.id);

            allRuns.push({
              instanceId: inst.id,
              n,
              seed,
              solverName,
              totalDistance: sol.totalDistance,
              totalDuration: sol.totalDuration,
              isFeasible: sol.isFeasible,
              violationCount: sol.violationCount,
              runtimeMs: sol.runtimeMs,
              optimalityGap: gap,
            });
          } catch (e) {
            this.logger.error(
              `${solverName} thất bại trên ${inst.id}: ${(e as Error).message}`,
            );
          }
        }
      }

      this.logger.log(
        `Size N=${n} xong (${instances.length} instance × ${config.solverNames.length} solver)`,
      );
    }

    const aggregates = this.aggregate(allRuns);
    const totalRuntimeMs = Date.now() - startWall;

    this.logger.log(
      `Benchmark hoàn tất: ${allRuns.length} runs trong ${totalRuntimeMs}ms`,
    );

    return {
      config,
      runs: allRuns,
      aggregates,
      totalInstances: config.sizes.length * config.seeds.length,
      totalRuntimeMs,
      referenceBySize,
    };
  }

  /**
   * Chạy 1 solver × 1 instance, đo runtime override (vì solver.runtimeMs
   * có thể tự đo). Trả TSPTWSolution.
   */
  async runSingle(
    solverName: string,
    instance: TSPTWInstance,
    config?: SolverConfig,
  ): Promise<TSPTWSolution> {
    const solver = this.solvers.get(solverName);
    if (!solver) {
      throw new Error(`Solver '${solverName}' không tồn tại`);
    }
    return this.runOnce(solver, instance, config);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private async runOnce(
    solver: TSPTWSolver,
    instance: TSPTWInstance,
    config?: SolverConfig,
  ): Promise<TSPTWSolution> {
    return solver.solve(instance, config);
  }

  /**
   * Chọn reference solver cho 1 size:
   *   - N ≤ maxBruteForceN: BruteForce (optimal)
   *   - N >  maxBruteForceN: OR-Tools (industrial baseline)
   * Nếu solver tương ứng không có trong solverNames → null → gap = null.
   */
  private pickReferenceSolver(
    n: number,
    config: Required<BenchmarkConfig>,
  ): string {
    if (
      n <= config.maxBruteForceN &&
      config.solverNames.includes('brute-force')
    ) {
      return 'brute-force';
    }
    if (config.solverNames.includes('or-tools')) {
      return 'or-tools';
    }
    // Fallback: chọn solver đầu tiên trong list
    return config.solverNames[0] ?? 'greedy-nearest-neighbor';
  }

  /**
   * Optimality gap = (solver - ref) / ref × 100%.
   * Null nếu ref undefined hoặc ref.distance = 0.
   * Có thể âm (solver tốt hơn ref, ví dụ ACO beat OR-Tools trong time limit).
   */
  private computeGap(sol: TSPTWSolution, ref?: TSPTWSolution): number | null {
    if (!ref || ref.totalDistance <= 0) return null;
    // Nếu cả 2 cùng vi phạm → so distance vẫn fair
    return ((sol.totalDistance - ref.totalDistance) / ref.totalDistance) * 100;
  }

  /**
   * Aggregate runs theo (n, solverName).
   */
  private aggregate(runs: BenchmarkRun[]): BenchmarkAggregate[] {
    const buckets = new Map<string, BenchmarkRun[]>();
    for (const r of runs) {
      const key = `${r.n}|${r.solverName}`;
      const arr = buckets.get(key);
      if (arr) arr.push(r);
      else buckets.set(key, [r]);
    }

    const out: BenchmarkAggregate[] = [];
    for (const [key, group] of buckets) {
      const [nStr, solverName] = key.split('|');
      const n = parseInt(nStr, 10);
      const distances = group.map((r) => r.totalDistance);
      const runtimes = group.map((r) => r.runtimeMs);
      const feasibleCount = group.filter((r) => r.isFeasible).length;
      const gaps = group
        .map((r) => r.optimalityGap)
        .filter((g): g is number => g !== null);
      const violations = group.map((r) => r.violationCount);

      out.push({
        n,
        solverName,
        runs: group.length,
        distanceBest: Math.min(...distances),
        distanceMean: mean(distances),
        distanceMedian: median(distances),
        distanceStd: std(distances),
        runtimeMean: mean(runtimes),
        runtimeMax: Math.max(...runtimes),
        feasibilityRate: feasibleCount / group.length,
        violationsMean: mean(violations),
        gapMean: gaps.length > 0 ? mean(gaps) : null,
      });
    }

    // Sort theo (n, solverName) cho dễ đọc
    out.sort((a, b) => a.n - b.n || a.solverName.localeCompare(b.solverName));
    return out;
  }

  private applyDefaults(input?: BenchmarkConfig): Required<BenchmarkConfig> {
    return {
      sizes: input?.sizes ?? [5, 8, 10, 12],
      seeds: input?.seeds ?? [1, 2, 3, 4, 5],
      solverNames: input?.solverNames ?? Array.from(this.solvers.keys()),
      generateConfig: input?.generateConfig ?? {},
      solverConfig: input?.solverConfig ?? {},
      maxBruteForceN: input?.maxBruteForceN ?? 12,
    };
  }

  /**
   * Gắn seed của instance vào solver config để metaheuristic ngẫu nhiên
   * (ACO + 2-opt, Simulated Annealing) trở nên TẤT ĐỊNH & tái lập 100%.
   *
   * Trước đây benchmark chỉ truyền `solverConfig` (vd `{timeLimitMs:3000}`)
   * không kèm seed → ACO/SA fallback `Date.now()` → mỗi lần chạy ra số khác
   * nhau, cột std trộn lẫn nhiễu instance + nhiễu RNG, không tái lập được.
   *
   * Nay mỗi solver chạy trên instance có id `...-s{seed}` sẽ nhận đúng
   * seed đó: cùng (N, seed) → cùng kết quả. Không ghi đè nếu caller đã
   * chỉ định seed tường minh trong solverConfig.
   */
  private withInstanceSeed(
    base: SolverConfig,
    instance: TSPTWInstance,
  ): SolverConfig {
    if (base.seed !== undefined) return base;
    return { ...base, seed: this.extractSeed(instance.id) };
  }

  /** Trích seed từ id `gen-N{n}-r{r}-w{w}-s{seed}`. */
  private extractSeed(instanceId: string): number {
    const m = instanceId.match(/-s(-?\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  }
}

// ─── Stat helpers ───────────────────────────────────────────────────────

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[m - 1] + sorted[m]) / 2 : sorted[m];
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}
