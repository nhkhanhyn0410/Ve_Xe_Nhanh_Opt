/**
 * Standalone re-run của toàn bộ thực nghiệm Chương 5 (TN2–TN5).
 *
 * Lý do tồn tại: bootstrap đầy đủ AppModule yêu cầu MongoDB (DatabaseModule)
 * và HTTP server. Phân hệ solver KHÔNG dùng DB (xem Phụ lục B báo cáo).
 * Script này dựng một application-context tối giản chỉ gồm các module solver
 * → chạy ĐÚNG code production (BenchmarkRunner / AcoTuner / ShuttleMultiHubService)
 * → kết quả tái lập 100% sau khi đã sửa seed-threading.
 *
 * Chạy:  npx ts-node --transpile-only -r tsconfig-paths/register \
 *          src/rerun-experiments.ts
 *
 * Ghi đè: <repo>/ket-qua/{tn2-tune-aco,tn2-tune-aco-no-2opt,tn3-benchmark,
 *          tn4-vrptw-{long,med,tight},tn5-md-{cluster,mixed}}.json
 * Định dạng giữ nguyên `{ success: true, data: <report> }` như cũ.
 */
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { config as loadEnv } from 'dotenv';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { OsrmModule } from './modules/osrm/osrm.module';
import { ShuttleOptimizerModule } from './modules/shuttle-optimizer/shuttle-optimizer.module';
import { ShuttleMultiHubModule } from './modules/shuttle-multi-hub/shuttle-multi-hub.module';
import { BenchmarkRunner } from './modules/shuttle-optimizer/benchmark/benchmark-runner';
import { AcoTuner } from './modules/shuttle-optimizer/benchmark/aco-tuner';
import { ShuttleMultiHubService } from './modules/shuttle-multi-hub/shuttle-multi-hub.service';
import { MultiHubGenerateConfig } from './modules/shuttle-multi-hub/benchmark/instance-generator';

// Nạp env (chỉ để OsrmService có OSRM_URL → thử rồi fallback Haversine,
// đúng cấu hình mọi thực nghiệm trong báo cáo). KHÔNG dùng Joi nên không
// đòi MONGODB_URI; KHÔNG import DatabaseModule nên không kết nối Mongo.
loadEnv({ path: join(__dirname, '..', '.env.development') });
loadEnv({ path: join(__dirname, '..', '.env') });

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    OsrmModule,
    ShuttleOptimizerModule,
    ShuttleMultiHubModule,
  ],
})
class RerunModule {}

async function main(): Promise<void> {
  const outDir = join(__dirname, '..', '..', '..', 'ket-qua');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const app = await NestFactory.createApplicationContext(RerunModule, {
    logger: ['error', 'warn', 'log'],
  });

  const save = (name: string, data: unknown): void => {
    const file = join(outDir, name);
    writeFileSync(
      file,
      JSON.stringify({ success: true, data }, null, 2),
      'utf8',
    );
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${name}`);
  };

  const t0 = Date.now();

  // ─── TN3 — Benchmark 6 solver TSPTW (mục 5.4) ─────────────────────────
  // Payload đúng như huong_dan.md / báo cáo §5.4.
  console.log('[TN3] benchmark 6 solver (sizes 5,8,10,12 × seeds 1..5)…');
  const benchmark = app.get(BenchmarkRunner);
  const tn3 = await benchmark.runConfig({
    sizes: [5, 8, 10, 12],
    seeds: [1, 2, 3, 4, 5],
    solverConfig: { timeLimitMs: 3000 },
    maxBruteForceN: 12,
  });
  save('tn3-benchmark.json', tn3);

  // ─── TN2 — Tuning ACO (mục 5.3) ───────────────────────────────────────
  // Body rỗng → mặc định N=10, seeds 1..5, α∈{0.5,1,1.5,2},
  // β∈{2,3,4,5}, ρ∈{0.05,0.1,0.2,0.3}, 50 iter, 3000 ms
  // (giống endpoint POST /tune-aco).
  console.log('[TN2] tune-aco grid search (64 config × 5 seed)…');
  const tuner = app.get(AcoTuner);
  const tn2 = await tuner.tune({});
  save('tn2-tune-aco.json', tn2);

  // ─── TN2b — Ablation: y hệt TN2 nhưng TẮT 2-opt (mục 5.3) ────────────
  // Đối chứng có kiểm soát: cùng N=10, cùng seeds 1..5, cùng lưới 64 cấu
  // hình α×β×ρ — đổi DUY NHẤT useLocalSearch=false → ACO (MMAS) bỏ bước
  // 2-opt refine top-K nhưng VẪN giữ greedy seed (KHÔNG phải "ACO thuần").
  // Mục đích: bằng chứng vai trò 2-opt — khi gỡ local search, không gian
  // nghiệm nở rộng, lộ rõ ảnh hưởng thật của α–β và ρ vốn bị 2-opt che ở
  // N nhỏ. KHÔNG dùng để chọn tham số cho benchmark §5.4 (benchmark chạy
  // ACO+2-opt nên cấu hình tuning hợp lệ vẫn là tn2-tune-aco.json).
  console.log('[TN2b] tune-aco ablation — useLocalSearch=false (64 × 5)…');
  const tn2NoLs = await tuner.tune({ useLocalSearch: false });
  save('tn2-tune-aco-no-2opt.json', tn2NoLs);

  // ─── TN4 — VRPTW 3 kịch bản (mục 5.5) ─────────────────────────────────
  console.log('[TN4] VRPTW long / med / tight…');
  const mh = app.get(ShuttleMultiHubService);
  const vrptw = (
    vehicleCount: number,
    windowWidthMinutes: number,
    depotEndTime: number,
  ): MultiHubGenerateConfig => ({
    mode: 'vrptw',
    customerCount: 14,
    vehicleCount,
    radiusKm: 7,
    windowWidthMinutes,
    depotEndTime,
    seed: 42,
  });
  save(
    'tn4-vrptw-long.json',
    await mh.solveDemo(vrptw(2, 90, 450), 'aco-2opt-vrptw'),
  );
  save(
    'tn4-vrptw-med.json',
    await mh.solveDemo(vrptw(2, 55, 430), 'aco-2opt-vrptw'),
  );
  save(
    'tn4-vrptw-tight.json',
    await mh.solveDemo(vrptw(3, 35, 420), 'aco-2opt-vrptw'),
  );

  // ─── TN5 — MDVRPTW 2 kịch bản (mục 5.6) ───────────────────────────────
  console.log('[TN5] MDVRPTW cluster (seed) / mixed (r=18, seed=7)…');
  save('tn5-md-cluster.json', await mh.solveSeed('mdvrptw'));
  save(
    'tn5-md-mixed.json',
    await mh.solveDemo({
      mode: 'mdvrptw',
      customerCount: 14,
      radiusKm: 18,
      seed: 7,
    }),
  );

  await app.close();
  console.log(
    `\nDONE — toàn bộ TN2–TN5 trong ${((Date.now() - t0) / 1000).toFixed(1)}s.\n` +
      `Output: ${outDir}`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('RERUN FAILED:', err);
  process.exit(1);
});
