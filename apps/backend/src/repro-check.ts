/** Reproducibility spot-check: chạy 2 lần, khẳng định kết quả TRÙNG KHÍT. */
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { OsrmModule } from './modules/osrm/osrm.module';
import { ShuttleOptimizerModule } from './modules/shuttle-optimizer/shuttle-optimizer.module';
import { ShuttleMultiHubModule } from './modules/shuttle-multi-hub/shuttle-multi-hub.module';
import { BenchmarkRunner } from './modules/shuttle-optimizer/benchmark/benchmark-runner';
import { ShuttleMultiHubService } from './modules/shuttle-multi-hub/shuttle-multi-hub.service';

loadEnv({ path: join(__dirname, '..', '.env.development') });

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    OsrmModule,
    ShuttleOptimizerModule,
    ShuttleMultiHubModule,
  ],
})
class M {}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(M, {
    logger: ['error'],
  });
  const bench = app.get(BenchmarkRunner);
  const mh = app.get(ShuttleMultiHubService);

  // ACO+2-opt TSPTW (the solver the user reported flapping 79.63 vs 85.74)
  const aco = async (): Promise<string> => {
    const r = await bench.runConfig({
      sizes: [10],
      seeds: [1, 2, 3],
      solverNames: ['aco-2opt-hybrid'],
      solverConfig: { timeLimitMs: 1000 },
      maxBruteForceN: 0,
    });
    return r.runs.map((x) => `${x.seed}:${x.totalDistance}`).join(' ');
  };
  // Multi-hub VRPTW (was non-deterministic via Date.now)
  const vrptw = async (): Promise<string> => {
    const r = await mh.solveDemo(
      {
        mode: 'vrptw',
        customerCount: 14,
        vehicleCount: 2,
        radiusKm: 7,
        windowWidthMinutes: 90,
        depotEndTime: 450,
        seed: 42,
      },
      'aco-2opt-vrptw',
    );
    return `${r.totalDistance}|${r.violationCount}`;
  };

  const a1 = await aco();
  const a2 = await aco();
  const v1 = await vrptw();
  const v2 = await vrptw();

  console.log('ACO  run1:', a1);
  console.log('ACO  run2:', a2);
  console.log('ACO  identical:', a1 === a2);
  console.log('VRPTW run1:', v1, ' run2:', v2, ' identical:', v1 === v2);
  console.log(a1 === a2 && v1 === v2 ? 'REPRODUCIBLE ✓' : 'NOT REPRODUCIBLE ✗');
  await app.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
