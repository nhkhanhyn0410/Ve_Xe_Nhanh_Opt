import { Injectable, Logger } from '@nestjs/common';
import { InstanceGenerator, GenerateConfig } from './instance-generator';
import { AntColonySolver, ACOConfig } from '../solvers/ant-colony.solver';
import { BruteForceSolver } from '../solvers/brute-force.solver';
import { OrToolsSolver } from '../solvers/or-tools.solver';
import { TSPTWSolver } from '../solvers/solver.interface';
import { TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution } from '../models/tsptw-solution';

/**
 * Config grid để tune ACO.
 */
export interface AcoTuneConfig {
  /** N — số customer để tune (chỉ 1 size, vì tune cho instance class này). Default 10. */
  customerCount?: number;
  /** Danh sách seed để có statistical average. Default [1..5]. */
  seeds?: number[];
  /** Generator options khác. */
  generateConfig?: Omit<GenerateConfig, 'customerCount' | 'seed'>;
  /** Grid α. Default [0.5, 1.0, 2.0]. */
  alphas?: number[];
  /** Grid β. Default [2, 3, 5]. */
  betas?: number[];
  /** Grid ρ (evaporation). Default [0.1, 0.2]. */
  rhos?: number[];
  /** Số iter ACO mỗi run. Default 50 (giảm để tune nhanh). */
  acoIterations?: number;
  /** Time limit mỗi run (ms). Default 3000. */
  timeLimitPerRun?: number;
  /** Cận N để dùng BruteForce làm reference. Default 12. */
  maxBruteForceN?: number;
}

/**
 * Kết quả tune cho 1 bộ (α, β, ρ).
 */
export interface AcoTuneResult {
  alpha: number;
  beta: number;
  rho: number;
  /** Số run = số seed (1 ACO run mỗi seed) */
  runs: number;
  /** Avg distance qua mọi seed */
  avgDistance: number;
  /** Std distance — đo độ ổn định */
  stdDistance: number;
  /** Avg optimality gap (%) so với reference. Null nếu không có reference. */
  avgGap: number | null;
  /** % seed cho ra feasible solution */
  feasibilityRate: number;
  /** Avg runtime (ms) */
  avgRuntimeMs: number;
}

/**
 * Report tổng hợp sau khi tune xong.
 */
export interface AcoTuneReport {
  /** Tất cả config × kết quả, đã sort theo (avgGap asc, avgDistance asc) */
  results: AcoTuneResult[];
  /** Config tốt nhất */
  bestConfig: { alpha: number; beta: number; rho: number };
  /** Reference solver dùng để tính gap */
  referenceSolverName: string;
  /** Tổng số run = |grid| × |seeds| */
  totalRuns: number;
  /** Wall-clock time (ms) */
  totalRuntimeMs: number;
}

/**
 * AcoTuner — Grid Search hyperparameter cho ACO+2-Opt solver.
 *
 * Mục đích trong báo cáo AI:
 *   - Chứng minh bộ params dùng trong experiment chính là OPTIMAL cho
 *     instance class này, không phải hardcode bừa.
 *   - Cho thấy ảnh hưởng của α, β, ρ lên chất lượng nghiệm
 *     (slide heatmap, bảng so sánh).
 *
 * Cách dùng:
 *   - tune({ alphas: [0.5, 1, 2], betas: [2, 3, 5], rhos: [0.1, 0.2] })
 *     → 3 × 3 × 2 = 18 config × 5 seed = 90 runs ACO
 *     → Trả về sorted theo avgGap, best ở [0]
 *
 * Workflow:
 *   1. Sinh M instance với M seed (cùng N, reproducible)
 *   2. Chạy reference solver (BF nếu N ≤ 12, else OR-Tools) 1 lần / instance → cache
 *   3. Với mỗi bộ (α, β, ρ):
 *      a) Chạy ACO trên M instance
 *      b) Tính avgDistance, stdDistance, feasibilityRate, avgGap so với reference
 *   4. Sort + trả về
 */
@Injectable()
export class AcoTuner {
  private readonly logger = new Logger(AcoTuner.name);

  constructor(
    private readonly generator: InstanceGenerator,
    private readonly aco: AntColonySolver,
    private readonly bruteForce: BruteForceSolver,
    private readonly orTools: OrToolsSolver,
  ) {}

  async tune(input?: AcoTuneConfig): Promise<AcoTuneReport> {
    const startWall = Date.now();
    const config = this.applyDefaults(input);

    this.logger.log(
      `ACO tune start: N=${config.customerCount}, seeds=${config.seeds.length}, ` +
        `grid α×β×ρ = ${config.alphas.length}×${config.betas.length}×${config.rhos.length} ` +
        `= ${config.alphas.length * config.betas.length * config.rhos.length} configs`,
    );

    // ─── 1. Sinh instances ────────────────────────────────────────────
    const instances = await Promise.all(
      config.seeds.map((seed) =>
        this.generator.generate({
          customerCount: config.customerCount,
          seed,
          ...config.generateConfig,
        }),
      ),
    );

    // ─── 2. Chạy reference solver, cache kết quả ──────────────────────
    const refSolver: TSPTWSolver =
      config.customerCount <= config.maxBruteForceN
        ? this.bruteForce
        : this.orTools;

    const refResults = new Map<string, TSPTWSolution>();
    for (const inst of instances) {
      try {
        const sol = await refSolver.solve(inst);
        refResults.set(inst.id, sol);
      } catch (e) {
        this.logger.warn(
          `Reference ${refSolver.name} lỗi trên ${inst.id}: ${(e as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Reference (${refSolver.name}) chạy xong trên ${refResults.size}/${instances.length} instance`,
    );

    // ─── 3. Grid search ───────────────────────────────────────────────
    const results: AcoTuneResult[] = [];
    let comboIdx = 0;
    const totalCombos =
      config.alphas.length * config.betas.length * config.rhos.length;

    for (const alpha of config.alphas) {
      for (const beta of config.betas) {
        for (const rho of config.rhos) {
          comboIdx++;
          const result = await this.evaluateCombo(
            alpha,
            beta,
            rho,
            instances,
            refResults,
            config,
          );
          results.push(result);

          this.logger.log(
            `[${comboIdx}/${totalCombos}] α=${alpha}, β=${beta}, ρ=${rho} → ` +
              `avgDist=${result.avgDistance.toFixed(2)}, ` +
              `avgGap=${result.avgGap?.toFixed(2) ?? 'n/a'}%, ` +
              `feas=${(result.feasibilityRate * 100).toFixed(0)}%`,
          );
        }
      }
    }

    // ─── 4. Sort: priority (avgGap asc, distance asc) ─────────────────
    // Nếu có gap → sort theo gap; nếu không → distance
    results.sort((a, b) => {
      if (a.avgGap !== null && b.avgGap !== null) {
        return a.avgGap - b.avgGap;
      }
      return a.avgDistance - b.avgDistance;
    });

    const best = results[0];
    const totalRuntimeMs = Date.now() - startWall;

    this.logger.log(
      `Tune xong trong ${totalRuntimeMs}ms. Best: α=${best.alpha}, β=${best.beta}, ` +
        `ρ=${best.rho} (gap ${best.avgGap?.toFixed(2) ?? 'n/a'}%)`,
    );

    return {
      results,
      bestConfig: { alpha: best.alpha, beta: best.beta, rho: best.rho },
      referenceSolverName: refSolver.name,
      totalRuns: totalCombos * config.seeds.length,
      totalRuntimeMs,
    };
  }

  /**
   * Chạy 1 bộ (α, β, ρ) trên tất cả instance, tổng hợp.
   */
  private async evaluateCombo(
    alpha: number,
    beta: number,
    rho: number,
    instances: TSPTWInstance[],
    refResults: Map<string, TSPTWSolution>,
    config: Required<AcoTuneConfig>,
  ): Promise<AcoTuneResult> {
    const distances: number[] = [];
    const runtimes: number[] = [];
    const gaps: number[] = [];
    let feasibleCount = 0;

    for (const inst of instances) {
      const acoCfg: ACOConfig = {
        alpha,
        beta,
        evaporationRate: rho,
        maxIterations: config.acoIterations,
        timeLimitMs: config.timeLimitPerRun,
        seed: this.extractSeed(inst.id),
      };

      const fullInst = inst;
      const sol = await this.aco.solve(fullInst, acoCfg);

      distances.push(sol.totalDistance);
      runtimes.push(sol.runtimeMs);
      if (sol.isFeasible) feasibleCount++;

      const ref = refResults.get(inst.id);
      if (ref && ref.totalDistance > 0) {
        gaps.push(
          ((sol.totalDistance - ref.totalDistance) / ref.totalDistance) * 100,
        );
      }
    }

    return {
      alpha,
      beta,
      rho,
      runs: instances.length,
      avgDistance: mean(distances),
      stdDistance: std(distances),
      avgGap: gaps.length > 0 ? mean(gaps) : null,
      feasibilityRate: feasibleCount / instances.length,
      avgRuntimeMs: mean(runtimes),
    };
  }

  private applyDefaults(input?: AcoTuneConfig): Required<AcoTuneConfig> {
    return {
      customerCount: input?.customerCount ?? 10,
      seeds: input?.seeds ?? [1, 2, 3, 4, 5],
      generateConfig: input?.generateConfig ?? {},
      alphas: input?.alphas ?? [0.5, 1.0, 2.0],
      betas: input?.betas ?? [2, 3, 5],
      rhos: input?.rhos ?? [0.1, 0.2],
      acoIterations: input?.acoIterations ?? 50,
      timeLimitPerRun: input?.timeLimitPerRun ?? 3000,
      maxBruteForceN: input?.maxBruteForceN ?? 12,
    };
  }

  private extractSeed(instanceId: string): number {
    const m = instanceId.match(/-s(-?\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  }
}

// ─── Stats ─────────────────────────────────────────────────────────────

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}
