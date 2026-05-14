import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { TSPTWSolver, SolverConfig } from './solver.interface';
import { endDepotMatrixIdx, TSPTWInstance } from '../models/tsptw-instance';
import { TSPTWSolution, emptySolution } from '../models/tsptw-solution';

/**
 * Cấu hình riêng cho OR-Tools solver.
 */
export interface OrToolsConfig extends SolverConfig {
  /** Lệnh Python (mặc định: 'python' trên Windows, 'python3' trên *nix). */
  pythonCommand?: string;
  /** Phạt mỗi vi phạm TW (matches SA). Default 10000. */
  violationPenalty?: number;
}

/** Shape JSON do Python script trả về. */
interface PythonOutput {
  status: 'OK' | 'ERROR';
  route: number[];
  total_distance: number;
  total_duration: number;
  arrival_times: number[];
  violations: number;
  error_message: string | null;
}

/**
 * Google OR-Tools solver — BASELINE CÔNG NGHIỆP.
 *
 * --- Strategy ---
 *
 *   Spawn Python subprocess chạy OR-Tools' Routing Model với
 *   GUIDED_LOCAL_SEARCH metaheuristic. Communication qua stdin/stdout JSON.
 *
 *   Lý do dùng Python: binding Node.js của OR-Tools (`@google/ortools`)
 *   thiếu nhiều feature so với Python wrapper chính thống.
 *
 * --- Pipeline ---
 *
 *   1. NestJS ghi instance JSON ra stdin của Python process
 *   2. `python or-tools-solver.py` đọc, giải, ghi JSON ra stdout
 *   3. NestJS đọc stdout, parse, trả về TSPTWSolution
 *
 * --- Time window xử lý ---
 *
 *   Dùng SOFT upper bound (`SetCumulVarSoftUpperBound`) với penalty lớn.
 *   → Matching với behavior của Greedy / 2-Opt / SA (đếm vi phạm thay vì reject).
 *   → Nếu instance khả thi → OR-Tools sẽ tìm 0-violation.
 *   → Nếu không khả thi → trả nghiệm "ít vi phạm nhất + distance thấp".
 *
 * --- Yêu cầu hệ thống ---
 *
 *   - Python 3.8+
 *   - `pip install ortools` (~150MB)
 *
 *   Nếu thiếu Python hoặc ortools → log warning, trả emptySolution.
 *   Solver khác không bị ảnh hưởng.
 *
 * --- Vai trò trong report ---
 *
 *   Upper bound chất lượng. Optimality gap được tính:
 *
 *     gap = (solver_distance - or_tools_distance) / or_tools_distance × 100%
 *
 *   Kỳ vọng ACO+2opt đạt gap < 5% trên N ≤ 20.
 */
@Injectable()
export class OrToolsSolver extends TSPTWSolver {
  private readonly logger = new Logger(OrToolsSolver.name);

  readonly name = 'or-tools';

  /** Default time limit (ms) — Python subprocess overhead ~1s. */
  private static readonly DEFAULT_TIME_LIMIT_MS = 10_000;

  /** Default violation penalty (matches SA). */
  private static readonly DEFAULT_VIOLATION_PENALTY = 10_000;

  /** Đường dẫn Python script — cùng folder TS file. */
  private readonly scriptPath = path.join(__dirname, 'or-tools-solver.py');

  async solve(
    instance: TSPTWInstance,
    config?: OrToolsConfig,
  ): Promise<TSPTWSolution> {
    const start = Date.now();
    const n = instance.customers.length;

    if (n === 0) {
      return emptySolution(this.name);
    }

    // Kiểm tra script tồn tại
    if (!fs.existsSync(this.scriptPath)) {
      this.logger.error(
        `Không tìm thấy ${this.scriptPath}. ` +
          `Nếu chạy production build, đảm bảo file .py được copy qua nest-cli.json assets.`,
      );
      return emptySolution(this.name);
    }

    // Build input JSON cho Python
    const timeLimitMs =
      config?.timeLimitMs ?? OrToolsSolver.DEFAULT_TIME_LIMIT_MS;
    const violationPenalty =
      config?.violationPenalty ?? OrToolsSolver.DEFAULT_VIOLATION_PENALTY;
    const endIdx = endDepotMatrixIdx(instance);

    const allTimeWindows: Array<[number, number]> = [
      [instance.depot.timeWindow.earliest, instance.depot.timeWindow.latest],
      ...instance.customers.map(
        (c) => [c.timeWindow.earliest, c.timeWindow.latest] as [number, number],
      ),
    ];
    const allServiceTimes: number[] = [
      instance.depot.serviceTime,
      ...instance.customers.map((c) => c.serviceTime),
    ];
    if (instance.endDepot) {
      allTimeWindows.push([
        instance.endDepot.timeWindow.earliest,
        instance.endDepot.timeWindow.latest,
      ]);
      allServiceTimes.push(instance.endDepot.serviceTime);
    }

    const input = {
      distance_matrix: instance.distanceMatrix,
      duration_matrix: instance.durationMatrix,
      time_windows: allTimeWindows,
      service_times: allServiceTimes,
      depot_start: instance.depotStartTime,
      depot_end: instance.depotEndTime,
      end_depot_index: endIdx,
      customer_count: n,
      time_limit_seconds: Math.max(1, Math.floor(timeLimitMs / 1000)),
      violation_penalty: violationPenalty,
    };

    try {
      const output = await this.runPython(
        config?.pythonCommand ?? this.defaultPython(),
        input,
        timeLimitMs + 3000, // overhead 3s cho Python startup
      );
      return this.toSolution(output, Date.now() - start);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`${this.name} thất bại: ${msg}`);
      return {
        ...emptySolution(this.name),
        runtimeMs: Date.now() - start,
      };
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  /**
   * Chạy Python subprocess, đẩy `input` qua stdin, đọc JSON từ stdout.
   * Throw nếu script lỗi, exit code khác 0, hoặc timeout.
   */
  private runPython(
    pythonCmd: string,
    input: object,
    killAfterMs: number,
  ): Promise<PythonOutput> {
    return new Promise((resolve, reject) => {
      const proc = spawn(pythonCmd, [this.scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      const killTimer = setTimeout(() => {
        killed = true;
        proc.kill('SIGKILL');
      }, killAfterMs);

      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      proc.on('error', (err) => {
        clearTimeout(killTimer);
        reject(
          new Error(
            `Spawn '${pythonCmd}' lỗi: ${err.message}. ` +
              `Kiểm tra Python đã cài chưa.`,
          ),
        );
      });

      proc.on('close', (code) => {
        clearTimeout(killTimer);
        if (killed) {
          reject(new Error(`Timeout sau ${killAfterMs}ms (đã kill)`));
          return;
        }
        if (!stdout.trim()) {
          reject(
            new Error(
              `Python không output gì. exit=${code}. stderr: ${stderr.slice(0, 500)}`,
            ),
          );
          return;
        }
        try {
          const parsed = JSON.parse(stdout) as PythonOutput;
          if (parsed.status === 'ERROR') {
            reject(new Error(parsed.error_message ?? 'Python ERROR'));
            return;
          }
          resolve(parsed);
        } catch (e) {
          reject(
            new Error(
              `Parse JSON output thất bại: ${(e as Error).message}. ` +
                `stdout (500c đầu): ${stdout.slice(0, 500)}`,
            ),
          );
        }
      });

      // Gửi input qua stdin
      proc.stdin.write(JSON.stringify(input));
      proc.stdin.end();
    });
  }

  private toSolution(out: PythonOutput, runtimeMs: number): TSPTWSolution {
    return {
      route: out.route,
      totalDistance: out.total_distance,
      totalDuration: out.total_duration,
      isFeasible: out.violations === 0,
      violationCount: out.violations,
      arrivalTimes: out.arrival_times,
      solverName: this.name,
      runtimeMs,
    };
  }

  /** Chọn lệnh Python theo platform — 'python' Win, 'python3' *nix. */
  private defaultPython(): string {
    return process.platform === 'win32' ? 'python' : 'python3';
  }
}
