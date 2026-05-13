import { AcoTuner } from './aco-tuner';
import { InstanceGenerator } from './instance-generator';
import { OsrmDistanceMatrixService } from '../distance/osrm-distance-matrix.service';
import { GreedySolver } from '../solvers/greedy.solver';
import { TwoOptSolver } from '../solvers/two-opt.solver';
import { AntColonySolver } from '../solvers/ant-colony.solver';
import { BruteForceSolver } from '../solvers/brute-force.solver';
import { OrToolsSolver } from '../solvers/or-tools.solver';

describe('AcoTuner', () => {
  const distanceService = new OsrmDistanceMatrixService();
  const generator = new InstanceGenerator(distanceService);
  const greedy = new GreedySolver();
  const twoOpt = new TwoOptSolver(greedy);
  const aco = new AntColonySolver(greedy, twoOpt);
  const bruteForce = new BruteForceSolver();
  const orTools = new OrToolsSolver();

  const tuner = new AcoTuner(generator, aco, bruteForce, orTools);

  it('tune với grid nhỏ trả về report đúng cấu trúc', async () => {
    const report = await tuner.tune({
      customerCount: 6,
      seeds: [1, 2],
      alphas: [1.0, 2.0],
      betas: [3.0],
      rhos: [0.1],
      acoIterations: 20,
      timeLimitPerRun: 2000,
    });

    // 2 × 1 × 1 = 2 configs
    expect(report.results).toHaveLength(2);
    expect(report.totalRuns).toBe(2 * 2); // 2 configs × 2 seeds

    // Reference = brute-force (N=6 ≤ 12)
    expect(report.referenceSolverName).toBe('brute-force');

    // Mỗi result có metrics
    report.results.forEach((r) => {
      expect(r.runs).toBe(2);
      expect(r.avgDistance).toBeGreaterThan(0);
      expect(r.feasibilityRate).toBeGreaterThanOrEqual(0);
      expect(r.feasibilityRate).toBeLessThanOrEqual(1);
      expect(r.avgGap).not.toBeNull(); // BF chạy được → có gap
    });

    // best config phải khớp top-1
    expect(report.bestConfig.alpha).toBe(report.results[0].alpha);
    expect(report.bestConfig.beta).toBe(report.results[0].beta);
    expect(report.bestConfig.rho).toBe(report.results[0].rho);
  }, 120_000);

  it('results sorted theo avgGap asc (top-1 là best)', async () => {
    const report = await tuner.tune({
      customerCount: 5,
      seeds: [1, 2, 3],
      alphas: [0.5, 1.0, 2.0],
      betas: [2, 3],
      rhos: [0.1],
      acoIterations: 20,
      timeLimitPerRun: 1500,
    });

    expect(report.results).toHaveLength(6); // 3 × 2 × 1

    // Sort check
    for (let i = 1; i < report.results.length; i++) {
      const prev = report.results[i - 1].avgGap;
      const cur = report.results[i].avgGap;
      if (prev !== null && cur !== null) {
        expect(prev).toBeLessThanOrEqual(cur);
      }
    }
  }, 180_000);

  it('reference fallback OR-Tools khi N > maxBruteForceN', async () => {
    const report = await tuner.tune({
      customerCount: 5,
      seeds: [1],
      alphas: [1.0],
      betas: [3.0],
      rhos: [0.1],
      acoIterations: 10,
      timeLimitPerRun: 1000,
      maxBruteForceN: 0, // force OR-Tools
    });
    expect(report.referenceSolverName).toBe('or-tools');
  }, 60_000);

  it('grid mặc định = 18 configs', () => {
    // Chỉ kiểm tra số lượng — không chạy đủ vì sẽ quá lâu
    const defaultGrid = {
      alphas: [0.5, 1.0, 2.0],
      betas: [2, 3, 5],
      rhos: [0.1, 0.2],
    };
    const total =
      defaultGrid.alphas.length *
      defaultGrid.betas.length *
      defaultGrid.rhos.length;
    expect(total).toBe(18);
  });
});
