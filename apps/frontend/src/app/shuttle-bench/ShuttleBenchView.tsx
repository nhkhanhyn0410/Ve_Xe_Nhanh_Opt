'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  InputNumber,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5501/api/v1';

// ─── Backend types ────────────────────────────────────────────────────

interface BenchmarkRun {
  instanceId: string;
  n: number;
  seed: number;
  solverName: string;
  totalDistance: number;
  totalDuration: number;
  isFeasible: boolean;
  violationCount: number;
  runtimeMs: number;
  optimalityGap: number | null;
}

interface BenchmarkAggregate {
  n: number;
  solverName: string;
  runs: number;
  distanceBest: number;
  distanceMean: number;
  distanceMedian: number;
  distanceStd: number;
  runtimeMean: number;
  runtimeMax: number;
  feasibilityRate: number;
  violationsMean: number;
  gapMean: number | null;
}

interface BenchmarkReport {
  runs: BenchmarkRun[];
  aggregates: BenchmarkAggregate[];
  totalInstances: number;
  totalRuntimeMs: number;
  referenceBySize: Record<number, string>;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

// ─── Config ───────────────────────────────────────────────────────────

const ALL_SOLVERS = [
  { value: 'greedy-nearest-neighbor', label: 'Greedy (NN)' },
  { value: 'brute-force', label: 'Brute Force' },
  { value: 'two-opt', label: '2-Opt' },
  { value: 'simulated-annealing', label: 'Simulated Annealing' },
  { value: 'aco-2opt-hybrid', label: 'ACO + 2-Opt ★' },
  { value: 'or-tools', label: 'OR-Tools' },
];

const SIZE_OPTIONS = [5, 6, 8, 10, 12, 15];
const SEED_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface BenchConfig {
  sizes: number[];
  seeds: number[];
  solverNames: string[];
  timeLimitMs: number;
  maxBruteForceN: number;
}

const DEFAULT_CONFIG: BenchConfig = {
  sizes: [5, 8, 10],
  seeds: [1, 2, 3],
  solverNames: ALL_SOLVERS.map((s) => s.value),
  timeLimitMs: 3000,
  maxBruteForceN: 12,
};

// ─── Helpers ──────────────────────────────────────────────────────────

function fmtGap(gap: number | null): string {
  if (gap === null) return 'n/a';
  if (Math.abs(gap) < 0.005) return '0.00%';
  return `${gap > 0 ? '+' : ''}${gap.toFixed(2)}%`;
}

function gapColor(gap: number | null): string {
  if (gap === null) return 'default';
  if (Math.abs(gap) < 0.5) return 'green';
  if (gap < 5) return 'blue';
  if (gap < 15) return 'orange';
  return 'red';
}

function solverLabel(name: string): string {
  return ALL_SOLVERS.find((s) => s.value === name)?.label ?? name;
}

// ─── Component ────────────────────────────────────────────────────────

export default function ShuttleBenchView() {
  const [config, setConfig] = useState<BenchConfig>(DEFAULT_CONFIG);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  /** Tổng số run dự kiến — để hiển thị warning nếu nhiều */
  const expectedRuns = useMemo(
    () => config.sizes.length * config.seeds.length * config.solverNames.length,
    [config],
  );

  const runBenchmark = async () => {
    setLoading(true);
    setError(null);
    setProgress(10);
    try {
      // Fake progress vì backend không stream
      const interval = setInterval(() => {
        setProgress((p) => (p < 90 ? p + 5 : p));
      }, 800);

      const res = await fetch(`${API_BASE}/shuttle-optimizer/benchmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sizes: config.sizes,
          seeds: config.seeds,
          solverNames: config.solverNames,
          solverConfig: { timeLimitMs: config.timeLimitMs },
          maxBruteForceN: config.maxBruteForceN,
        }),
      });
      clearInterval(interval);

      const json = (await res.json()) as
        | Envelope<BenchmarkReport>
        | BenchmarkReport;
      if (!res.ok) {
        const msg =
          'message' in json && typeof json.message === 'string'
            ? json.message
            : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const payload =
        'success' in json && json.success && 'data' in json
          ? json.data
          : (json as BenchmarkReport);
      setReport(payload);
      setProgress(100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định');
      setReport(null);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1500);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>
            Shuttle Bench — So sánh 6 solver TSPTW
          </Title>
          <Text type="secondary">
            Chạy benchmark batch: <code>sizes × seeds × solvers</code> →
            aggregate metrics → so sánh + chọn solver tốt nhất cho báo cáo.
          </Text>
        </div>

        {/* ─── HƯỚNG DẪN ─── */}
        <Collapse
          items={[
            {
              key: 'help',
              label: '📖 Hướng dẫn dùng & diễn giải metrics (bấm để mở)',
              children: <BenchHelp />,
            },
          ]}
        />

        {/* ─── FORM CONFIG ─── */}
        <Card title="Cấu hình benchmark">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap size={[24, 12]}>
              <div>
                <Text strong>Sizes (N customers):</Text>
                <br />
                <Select
                  mode="multiple"
                  style={{ minWidth: 280 }}
                  value={config.sizes}
                  onChange={(v) => setConfig({ ...config, sizes: v })}
                  options={SIZE_OPTIONS.map((n) => ({
                    label: `N=${n}`,
                    value: n,
                  }))}
                  disabled={loading}
                />
              </div>
              <div>
                <Text strong>Seeds:</Text>
                <br />
                <Select
                  mode="multiple"
                  style={{ minWidth: 280 }}
                  value={config.seeds}
                  onChange={(v) => setConfig({ ...config, seeds: v })}
                  options={SEED_OPTIONS.map((s) => ({
                    label: `seed=${s}`,
                    value: s,
                  }))}
                  disabled={loading}
                />
              </div>
            </Space>

            <div>
              <Text strong>Solvers (tick nhiều):</Text>
              <br />
              <Select
                mode="multiple"
                style={{ minWidth: 600, width: '100%', maxWidth: 800 }}
                value={config.solverNames}
                onChange={(v) => setConfig({ ...config, solverNames: v })}
                options={ALL_SOLVERS}
                disabled={loading}
              />
            </div>

            <Space wrap size={[16, 8]}>
              <Space>
                <Text>Time limit / solver (ms):</Text>
                <InputNumber
                  min={500}
                  max={60000}
                  step={500}
                  value={config.timeLimitMs}
                  onChange={(v) =>
                    v !== null && setConfig({ ...config, timeLimitMs: v })
                  }
                  disabled={loading}
                  style={{ width: 110 }}
                />
              </Space>
              <Space>
                <Text>Max N cho BruteForce:</Text>
                <InputNumber
                  min={0}
                  max={18}
                  value={config.maxBruteForceN}
                  onChange={(v) =>
                    v !== null && setConfig({ ...config, maxBruteForceN: v })
                  }
                  disabled={loading}
                  style={{ width: 90 }}
                />
              </Space>
              <Tag
                color={expectedRuns > 100 ? 'orange' : 'blue'}
                style={{ fontSize: 13, padding: '4px 10px' }}
              >
                = {expectedRuns} runs
              </Tag>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => void runBenchmark()}
                loading={loading}
                disabled={
                  config.sizes.length === 0 ||
                  config.seeds.length === 0 ||
                  config.solverNames.length === 0
                }
              >
                Chạy benchmark
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => setConfig(DEFAULT_CONFIG)}
                disabled={loading}
              >
                Reset config
              </Button>
            </Space>

            {expectedRuns > 100 && (
              <Alert
                type="warning"
                showIcon
                message={`${expectedRuns} runs có thể mất vài phút. Giảm sizes/seeds hoặc time limit nếu cần nhanh.`}
              />
            )}

            {progress > 0 && (
              <Progress
                percent={progress}
                status={loading ? 'active' : 'success'}
                strokeColor={loading ? '#1677ff' : '#52c41a'}
              />
            )}
          </Space>
        </Card>

        {error && (
          <Alert
            type="error"
            showIcon
            message="Không gọi được API"
            description={error}
          />
        )}

        {/* ─── KẾT QUẢ ─── */}
        {report && (
          <>
            <SummaryCard report={report} />
            <AggregatesTable report={report} />
            <ComparisonPerSize report={report} />
          </>
        )}
      </Space>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function SummaryCard({ report }: { report: BenchmarkReport }) {
  return (
    <Card title="Tổng quan">
      <Row gutter={16}>
        <Col xs={12} md={6}>
          <Statistic title="Tổng runs" value={report.runs.length} />
        </Col>
        <Col xs={12} md={6}>
          <Statistic
            title="Tổng instances"
            value={report.totalInstances}
            suffix="× M seed"
          />
        </Col>
        <Col xs={12} md={6}>
          <Statistic
            title="Wall-clock time"
            value={(report.totalRuntimeMs / 1000).toFixed(1)}
            suffix="s"
          />
        </Col>
        <Col xs={12} md={6}>
          <Statistic
            title="Aggregate rows"
            value={report.aggregates.length}
            suffix="(N × solver)"
          />
        </Col>
      </Row>
      <Divider style={{ margin: '12px 0' }} />
      <Space wrap>
        <Text strong>Reference solver mỗi size:</Text>
        {Object.entries(report.referenceBySize).map(([n, name]) => (
          <Tag key={n} color="purple">
            N={n}: {solverLabel(name)}
          </Tag>
        ))}
      </Space>
    </Card>
  );
}

function AggregatesTable({ report }: { report: BenchmarkReport }) {
  return (
    <Card
      title="Bảng aggregate (mỗi dòng = 1 solver tại 1 size N)"
      extra={
        <Text type="secondary">
          Sort: N tăng dần, trong cùng N sort theo distanceMean
        </Text>
      }
    >
      <Table<BenchmarkAggregate>
        size="small"
        rowKey={(row) => `${row.n}-${row.solverName}`}
        dataSource={[...report.aggregates].sort(
          (a, b) => a.n - b.n || a.distanceMean - b.distanceMean,
        )}
        pagination={false}
        scroll={{ x: 1100 }}
        columns={[
          {
            title: 'N',
            dataIndex: 'n',
            width: 60,
            render: (n: number) => <Tag color="blue">N={n}</Tag>,
          },
          {
            title: 'Solver',
            dataIndex: 'solverName',
            width: 180,
            render: (s: string) => solverLabel(s),
          },
          {
            title: 'Runs',
            dataIndex: 'runs',
            width: 60,
          },
          {
            title: 'Best km',
            dataIndex: 'distanceBest',
            width: 90,
            render: (v: number) => v.toFixed(2),
            sorter: (a, b) => a.distanceBest - b.distanceBest,
          },
          {
            title: 'Mean km',
            dataIndex: 'distanceMean',
            width: 90,
            render: (v: number) => <strong>{v.toFixed(2)}</strong>,
          },
          {
            title: 'Std',
            dataIndex: 'distanceStd',
            width: 80,
            render: (v: number) => v.toFixed(2),
          },
          {
            title: 'Gap %',
            dataIndex: 'gapMean',
            width: 100,
            render: (g: number | null) => (
              <Tag color={gapColor(g)}>{fmtGap(g)}</Tag>
            ),
            sorter: (a, b) => (a.gapMean ?? 999) - (b.gapMean ?? 999),
          },
          {
            title: 'Feasibility',
            dataIndex: 'feasibilityRate',
            width: 110,
            render: (r: number) => (
              <Tag color={r === 1 ? 'green' : r > 0.5 ? 'orange' : 'red'}>
                {(r * 100).toFixed(0)}%
              </Tag>
            ),
          },
          {
            title: 'Viol. avg',
            dataIndex: 'violationsMean',
            width: 90,
            render: (v: number) => v.toFixed(1),
          },
          {
            title: 'Runtime avg (ms)',
            dataIndex: 'runtimeMean',
            width: 140,
            render: (v: number) => v.toFixed(0),
            sorter: (a, b) => a.runtimeMean - b.runtimeMean,
          },
        ]}
      />
    </Card>
  );
}

function ComparisonPerSize({ report }: { report: BenchmarkReport }) {
  // Group aggregates theo N
  const groups = new Map<number, BenchmarkAggregate[]>();
  for (const a of report.aggregates) {
    const arr = groups.get(a.n);
    if (arr) arr.push(a);
    else groups.set(a.n, [a]);
  }

  return (
    <Card title="So sánh trực quan theo từng N (thanh xanh = relative distance, càng ngắn càng tốt)">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {Array.from(groups.entries())
          .sort(([a], [b]) => a - b)
          .map(([n, aggregates]) => {
            const best = Math.min(...aggregates.map((a) => a.distanceMean));
            const worst = Math.max(...aggregates.map((a) => a.distanceMean));
            const range = Math.max(0.01, worst - best);
            return (
              <div key={n}>
                <Title level={5} style={{ marginBottom: 8 }}>
                  N = {n}
                </Title>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {[...aggregates]
                    .sort((a, b) => a.distanceMean - b.distanceMean)
                    .map((a) => {
                      // Bar length: best = 100%, worst = 0% (inverted, càng tốt càng dài)
                      const percent = Math.max(
                        5,
                        ((worst - a.distanceMean) / range) * 95 + 5,
                      );
                      const isBest = a.distanceMean === best;
                      return (
                        <Row key={a.solverName} gutter={8} align="middle">
                          <Col xs={24} sm={6}>
                            <Text strong={isBest}>
                              {isBest ? '🏆 ' : ''}
                              {solverLabel(a.solverName)}
                            </Text>
                          </Col>
                          <Col xs={20} sm={14}>
                            <Progress
                              percent={percent}
                              showInfo={false}
                              strokeColor={isBest ? '#52c41a' : '#1677ff'}
                              size="small"
                            />
                          </Col>
                          <Col xs={4} sm={4}>
                            <Text>
                              {a.distanceMean.toFixed(2)} km{' '}
                              <Tag color={gapColor(a.gapMean)}>
                                {fmtGap(a.gapMean)}
                              </Tag>
                            </Text>
                          </Col>
                        </Row>
                      );
                    })}
                </Space>
              </div>
            );
          })}
      </Space>
    </Card>
  );
}

function BenchHelp() {
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Paragraph>
        <strong>Workflow benchmark:</strong>
        <ol style={{ marginBottom: 0 }}>
          <li>
            Chọn <strong>sizes</strong> (N customers) — vd [5, 8, 10] để test
            scaling.
          </li>
          <li>
            Chọn <strong>seeds</strong> — mỗi seed = 1 instance random
            reproducible. Càng nhiều seed càng có ý nghĩa thống kê (≥ 5 khuyên
            dùng).
          </li>
          <li>
            Chọn <strong>solvers</strong> để so. Tick tất cả nếu muốn compare
            full.
          </li>
          <li>
            <strong>Time limit</strong> giới hạn thời gian mỗi solver. Quan
            trọng cho metaheuristic (SA, ACO) — cho nhiều thời gian thì kết quả
            tốt hơn.
          </li>
          <li>
            Bấm <em>Chạy benchmark</em> → đợi đến khi xong (vài giây đến vài
            phút).
          </li>
        </ol>
      </Paragraph>

      <Paragraph>
        <strong>Diễn giải metrics:</strong>
      </Paragraph>
      <ul style={{ marginTop: -16 }}>
        <li>
          <strong>Best km</strong>: best-of-M-runs — distance ngắn nhất solver
          tìm được trong các seed. Đo &quot;potential&quot;.
        </li>
        <li>
          <strong>Mean km</strong>: trung bình distance qua mọi seed. Đo
          &quot;expected&quot; — cái này quan trọng nhất cho báo cáo.
        </li>
        <li>
          <strong>Std</strong>: độ lệch chuẩn distance. Std thấp = solver ổn
          định. Metaheuristic thường std cao hơn deterministic.
        </li>
        <li>
          <strong>Gap %</strong>: optimality gap so với reference
          (BruteForce nếu N ≤ maxBruteForceN, else OR-Tools).
          <ul>
            <li>
              <Tag color="green">0%</Tag> = trùng reference (tối ưu)
            </li>
            <li>
              <Tag color="blue">&lt; 5%</Tag> = rất tốt (publication quality)
            </li>
            <li>
              <Tag color="orange">5-15%</Tag> = chấp nhận được
            </li>
            <li>
              <Tag color="red">&gt; 15%</Tag> = kém, cần tune
            </li>
          </ul>
        </li>
        <li>
          <strong>Feasibility</strong>: % instance solver giải feasible (0 vi
          phạm TW). 100% = luôn tìm ra nghiệm hợp lệ.
        </li>
        <li>
          <strong>Viol. avg</strong>: trung bình số vi phạm/run. Chi tiết hơn
          feasibility — biết khi infeasible thì sai bao nhiêu.
        </li>
        <li>
          <strong>Runtime avg</strong>: trung bình ms. So scaling theo N — vẽ
          chart runtime vs N để thấy O(complexity).
        </li>
      </ul>

      <Paragraph>
        <strong>Lưu ý quan trọng:</strong>
      </Paragraph>
      <ul style={{ marginTop: -16 }}>
        <li>
          <strong>BruteForce chỉ chạy được N ≤ 18.</strong> Với N=15 đã mất ~3s,
          N=18 ~30s. Đặt <code>Max N cho BruteForce</code> = 12 để tránh timeout
          khi N lớn.
        </li>
        <li>
          <strong>OR-Tools cần Python + pip install ortools.</strong> Nếu thiếu
          → solver trả empty solution + log warning.
        </li>
        <li>
          <strong>Reference solver được auto chọn theo N</strong>: BF cho N nhỏ
          (cận tối ưu), OR-Tools cho N lớn (cận thực tế công nghiệp).
        </li>
        <li>
          Khi solver = reference → gap = 0 (tự so với chính mình). Đây là sanity
          check.
        </li>
      </ul>

      <Paragraph>
        <strong>Cho báo cáo AI:</strong>
      </Paragraph>
      <ul style={{ marginTop: -16 }}>
        <li>
          Slide 1: bảng aggregate đầy đủ (copy từ trang này) → chứng minh ACO+2Opt
          có gap nhỏ
        </li>
        <li>
          Slide 2: chart runtime vs N → cho thấy heuristic scale tốt hơn BF
        </li>
        <li>
          Slide 3: feasibility comparison → đánh giá robust dưới time pressure
        </li>
      </ul>
    </Space>
  );
}
