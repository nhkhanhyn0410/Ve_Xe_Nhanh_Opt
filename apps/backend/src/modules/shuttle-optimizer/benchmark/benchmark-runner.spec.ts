import { BenchmarkRunner } from './benchmark-runner';
import { InstanceGenerator } from './instance-generator';
import { OsrmDistanceMatrixService } from '../distance/osrm-distance-matrix.service';
import { GreedySolver } from '../solvers/greedy.solver';
import { BruteForceSolver } from '../solvers/brute-force.solver';
import { TwoOptSolver } from '../solvers/two-opt.solver';
import { SimulatedAnnealingSolver } from '../solvers/simulated-annealing.solver';
import { AntColonySolver } from '../solvers/ant-colony.solver';
import { OrToolsSolver } from '../solvers/or-tools.solver';

describe('BenchmarkRunner', () => {
  // Wire toàn bộ DI graph thủ công (không qua NestJS module)
  const distanceService = new OsrmDistanceMatrixService();
  const generator = new InstanceGenerator(distanceService);
  const greedy = new GreedySolver();
  const bruteForce = new BruteForceSolver();
  const twoOpt = new TwoOptSolver(greedy);
  const sa = new SimulatedAnnealingSolver(greedy);
  const aco = new AntColonySolver(greedy, twoOpt);
  const orTools = new OrToolsSolver();

  const runner = new BenchmarkRunner(
    generator,
    greedy,
    bruteForce,
    twoOpt,
    sa,
    aco,
    orTools,
  );

  it('runConfig với defaults trả về report đầy đủ', async () => {
    // Config tối thiểu để chạy nhanh
    const report = await runner.runConfig({
      sizes: [5],
      seeds: [1, 2],
      solverNames: ['greedy-nearest-neighbor', 'two-opt', 'brute-force'],
    });

    // Total = 3 solver × 2 seed × 1 size = 6 runs
    expect(report.runs).toHaveLength(6);

    // Aggregates: 3 solver × 1 size = 3 entries
    expect(report.aggregates).toHaveLength(3);

    // Reference cho N=5 phải là brute-force (vì N ≤ maxBruteForceN)
    expect(report.referenceBySize[5]).toBe('brute-force');

    // Mỗi aggregate phải có metrics
    report.aggregates.forEach((a) => {
      expect(a.runs).toBe(2);
      expect(a.distanceBest).toBeGreaterThan(0);
      expect(a.distanceMean).toBeGreaterThan(0);
      expect(a.runtimeMean).toBeGreaterThanOrEqual(0);
      expect(a.feasibilityRate).toBeGreaterThanOrEqual(0);
      expect(a.feasibilityRate).toBeLessThanOrEqual(1);
    });

    expect(report.totalInstances).toBe(2);
    expect(report.totalRuntimeMs).toBeGreaterThan(0);
  }, 60_000);

  it('optimalityGap của BruteForce = 0 (so với chính nó)', async () => {
    const report = await runner.runConfig({
      sizes: [6],
      seeds: [42],
      solverNames: ['brute-force', 'greedy-nearest-neighbor'],
    });

    const bfRun = report.runs.find((r) => r.solverName === 'brute-force');
    expect(bfRun?.optimalityGap).toBeCloseTo(0, 5);

    const greedyRun = report.runs.find(
      (r) => r.solverName === 'greedy-nearest-neighbor',
    );
    // Greedy gap ≥ 0 (BF tối ưu, greedy không thể tốt hơn)
    expect(greedyRun?.optimalityGap).toBeGreaterThanOrEqual(-1e-6);
  }, 60_000);

  it('reference fallback OR-Tools khi N > maxBruteForceN — hoặc solver đầu nếu thiếu', async () => {
    // Set maxBruteForceN = 0 → BF không bao giờ là reference
    const report = await runner.runConfig({
      sizes: [5],
      seeds: [1],
      solverNames: ['greedy-nearest-neighbor', 'two-opt'],
      maxBruteForceN: 0,
    });
    // Không có or-tools trong solverNames → fallback first solver
    expect(report.referenceBySize[5]).toBe('greedy-nearest-neighbor');
  }, 30_000);

  it('aggregate sort đúng theo (n, solverName)', async () => {
    const report = await runner.runConfig({
      sizes: [5, 7],
      seeds: [1],
      solverNames: ['greedy-nearest-neighbor', 'brute-force'],
    });

    // Tổng 2 size × 2 solver = 4 aggregate
    expect(report.aggregates).toHaveLength(4);
    // Sort theo (n, solver) — n=5 trước n=7, trong cùng n thì alphabet
    expect(report.aggregates[0].n).toBe(5);
    expect(report.aggregates[1].n).toBe(5);
    expect(report.aggregates[2].n).toBe(7);
    expect(report.aggregates[3].n).toBe(7);
    expect(
      report.aggregates[0].solverName.localeCompare(
        report.aggregates[1].solverName,
      ),
    ).toBeLessThanOrEqual(0);
  }, 90_000);

  it('runSingle chạy 1 solver lẻ', async () => {
    const inst = await generator.generate({ customerCount: 5, seed: 42 });
    const sol = await runner.runSingle('greedy-nearest-neighbor', inst);
    expect(sol.solverName).toBe('greedy-nearest-neighbor');
    expect(sol.route).toHaveLength(5);
  });

  it('runSingle throw khi solver name không tồn tại', async () => {
    const inst = await generator.generate({ customerCount: 3, seed: 1 });
    await expect(runner.runSingle('xyz-nonexistent', inst)).rejects.toThrow(
      /không tồn tại/,
    );
  });

  it('extract seed từ instance.id đúng (regression)', async () => {
    const report = await runner.runConfig({
      sizes: [5],
      seeds: [99],
      solverNames: ['greedy-nearest-neighbor'],
    });
    expect(report.runs[0].seed).toBe(99);
  }, 30_000);

  it('thống kê chính xác — distance std với 1 run = 0', async () => {
    const report = await runner.runConfig({
      sizes: [5],
      seeds: [42], // chỉ 1 seed
      solverNames: ['greedy-nearest-neighbor'],
    });
    expect(report.aggregates[0].distanceStd).toBe(0);
  }, 30_000);

  it('multi-seed: distanceMedian nằm giữa best và worst', async () => {
    const report = await runner.runConfig({
      sizes: [6],
      seeds: [1, 2, 3, 4, 5],
      solverNames: ['greedy-nearest-neighbor'],
    });
    const agg = report.aggregates[0];
    expect(agg.runs).toBe(5);
    expect(agg.distanceMedian).toBeGreaterThanOrEqual(agg.distanceBest);
    // Median ≤ max distance (= max trong runs)
    const distances = report.runs.map((r) => r.totalDistance);
    expect(agg.distanceMedian).toBeLessThanOrEqual(Math.max(...distances));
  }, 60_000);
});
