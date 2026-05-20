/**
 * Standalone check ACO without 2-opt local search.
 *
 * Chay: npx ts-node --transpile-only -r tsconfig-paths/register \
 *         src/rerun-aco-no-2opt.ts
 *
 * Ghi: <repo>/ket-qua/tn2-tune-aco-no-2opt.json
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
import { AcoTuner } from './modules/shuttle-optimizer/benchmark/aco-tuner';

loadEnv({ path: join(__dirname, '..', '.env.development') });
loadEnv({ path: join(__dirname, '..', '.env') });

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    OsrmModule,
    ShuttleOptimizerModule,
  ],
})
class RerunAcoNo2OptModule {}

async function main(): Promise<void> {
  const outDir = join(__dirname, '..', '..', '..', 'ket-qua');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const app = await NestFactory.createApplicationContext(RerunAcoNo2OptModule, {
    logger: ['error', 'warn', 'log'],
  });

  const tuner = app.get(AcoTuner);
  const t0 = Date.now();

  // Same TN2 defaults, but explicitly disables the 2-opt refine step.
  const report = await tuner.tune({ useLocalSearch: false });
  const file = join(outDir, 'tn2-tune-aco-no-2opt.json');
  writeFileSync(file, JSON.stringify({ success: true, data: report }, null, 2));

  await app.close();

  // eslint-disable-next-line no-console
  console.log(
    `DONE - ACO no-2opt tune in ${((Date.now() - t0) / 1000).toFixed(1)}s\n` +
      `Output: ${file}`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('ACO NO-2OPT RERUN FAILED:', err);
  process.exit(1);
});
