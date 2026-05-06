'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { MapStep } from './ShuttleMap';

const { Title, Text } = Typography;

/** Leaflet phải client-only, không SSR */
const ShuttleMap = dynamic(() => import('./ShuttleMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Spin tip="Đang tải bản đồ..." />
    </div>
  ),
});

/** Shape trả về từ endpoint /api/v1/shuttle-optimizer/demo (đã unwrap) */
interface SolveResponse {
  solverName: string;
  totalDistance: number;
  totalDuration: number;
  isFeasible: boolean;
  violationCount: number;
  runtimeMs: number;
  /** Phút từ 00:00 — shuttle rời depot */
  depotDepartureTime: number;
  /** Phút từ 00:00 — shuttle về depot (= điểm lên xe khách chính) */
  depotArrivalTime: number;
  /** Hạn chót về depot — vượt qua = khách lỡ chuyến */
  depotEndWindow: number;
  steps: MapStep[];
  /** Polyline đường thật từ OSRM — [lng, lat][] */
  routeGeometry?: [number, number][];
}

/** Row hiển thị trong table — có thể là depot hoặc customer */
interface TableRow {
  key: string;
  kind: 'depot-start' | 'customer' | 'depot-end';
  label: string;
  arrivalTime: number;
  departureTime: number;
  distanceFromPrev: number;
  coordinates: [number, number];
  isLate?: boolean;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

/** URL backend — đổi theo env khi cần (NEXT_PUBLIC_API_BASE). Mặc định PORT=5501 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5501/api/v1';

/** Tọa độ depot demo — trùng với DEMO_SEED ở backend */
const DEPOT_COORDS: [number, number] = [106.7116, 10.8163];
const DEPOT_NAME = 'Bến Xe Miền Đông';

/** Các solver hiện có backend đã đăng ký */
const SOLVER_OPTIONS = [
  { label: 'Greedy — Nearest Neighbor', value: 'greedy-nearest-neighbor' },
  { label: 'Brute Force (Held-Karp)', value: 'brute-force' },
  { label: '2-Opt Local Search', value: '2-opt' },
  { label: 'Simulated Annealing', value: 'simulated-annealing' },
  { label: 'Ant Colony + 2-Opt', value: 'aco-2opt-hybrid' },
  { label: 'Google OR-Tools', value: 'or-tools' },
];

function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Tạo danh sách row cho table: prepend depot-xuất-phát + append depot-về-bến.
 * Đánh dấu `isLate` trên row depot cuối nếu vượt qua hạn `depotEndWindow`.
 */
function buildTableRows(data: SolveResponse | null): TableRow[] {
  if (!data) return [];

  const rows: TableRow[] = [];

  rows.push({
    key: 'depot-start',
    kind: 'depot-start',
    label: `${DEPOT_NAME} (xuất phát)`,
    arrivalTime: 0,
    departureTime: data.depotDepartureTime,
    distanceFromPrev: 0,
    coordinates: DEPOT_COORDS,
  });

  data.steps.forEach((s, idx) => {
    rows.push({
      key: s.customerId,
      kind: 'customer',
      label: `${idx + 1}. ${s.customerName}`,
      arrivalTime: s.arrivalTime,
      departureTime: s.departureTime,
      distanceFromPrev: s.distanceFromPrev,
      coordinates: s.coordinates,
    });
  });

  rows.push({
    key: 'depot-end',
    kind: 'depot-end',
    label: `${DEPOT_NAME} (lên xe khách chính)`,
    arrivalTime: data.depotArrivalTime,
    departureTime: 0,
    distanceFromPrev: 0,
    coordinates: DEPOT_COORDS,
    isLate: data.depotArrivalTime > data.depotEndWindow,
  });

  return rows;
}

export default function ShuttleDemoView() {
  const [solver, setSolver] = useState<string>('greedy-nearest-neighbor');
  const [data, setData] = useState<SolveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDemo = useCallback(async (solverName: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/shuttle-optimizer/demo?solver=${encodeURIComponent(solverName)}`,
        { method: 'GET' },
      );
      const json = (await res.json()) as Envelope<SolveResponse> | SolveResponse;
      if (!res.ok) {
        const msg =
          'message' in json && typeof json.message === 'string'
            ? json.message
            : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const payload: SolveResponse =
        'success' in json && json.success && 'data' in json
          ? json.data
          : (json as SolveResponse);
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDemo(solver);
  }, [solver, fetchDemo]);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>
            Shuttle Optimizer — Demo 10 khách TPHCM
          </Title>
          <Text type="secondary">
            Depot: {DEPOT_NAME}. Xe chính rời bến lúc 7:00 (phút 420) — shuttle phải
            đón xong trước đó.
          </Text>
        </div>

        <Card>
          <Space wrap>
            <Text strong>Thuật toán:</Text>
            <Select
              style={{ minWidth: 260 }}
              value={solver}
              options={SOLVER_OPTIONS}
              onChange={setSolver}
              disabled={loading}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void fetchDemo(solver)}
              loading={loading}
            >
              Chạy lại
            </Button>
          </Space>
        </Card>

        {error && (
          <Alert
            type="error"
            showIcon
            message="Không gọi được API /shuttle-optimizer/demo"
            description={
              <>
                <div>{error}</div>
                <Text type="secondary">
                  Kiểm tra backend đang chạy tại {API_BASE} và solver đã được
                  implement chưa.
                </Text>
              </>
            }
          />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Card
              title="Bản đồ lộ trình"
              styles={{ body: { padding: 0 } }}
              style={{ height: 560, overflow: 'hidden' }}
            >
              <div style={{ height: 510 }}>
                {data ? (
                  <ShuttleMap
                    depot={DEPOT_COORDS}
                    depotName={DEPOT_NAME}
                    steps={data.steps}
                    routeGeometry={data.routeGeometry}
                  />
                ) : (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Spin tip={loading ? 'Đang giải...' : 'Chưa có dữ liệu'} />
                  </div>
                )}
              </div>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card title="Kết quả" style={{ height: 560, overflow: 'auto' }}>
              {data ? (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Statistic title="Solver" value={data.solverName} />
                  <Row gutter={12}>
                    <Col span={12}>
                      <Statistic
                        title="Tổng quãng (km)"
                        value={data.totalDistance}
                        precision={2}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Tổng thời gian (phút)"
                        value={data.totalDuration}
                        precision={1}
                      />
                    </Col>
                  </Row>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Statistic
                        title="Runtime (ms)"
                        value={data.runtimeMs}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Vi phạm TW"
                        value={data.violationCount}
                        valueStyle={{
                          color: data.violationCount > 0 ? '#cf1322' : '#3f8600',
                        }}
                      />
                    </Col>
                  </Row>
                  <Space wrap>
                    <Tag color={data.isFeasible ? 'green' : 'red'}>
                      {data.isFeasible ? 'FEASIBLE' : 'INFEASIBLE'}
                    </Tag>
                    {data.depotArrivalTime > data.depotEndWindow && (
                      <Tag color="red">
                        Lỡ chuyến! Về bến {minutesToHHMM(data.depotArrivalTime)}{' '}
                        &gt; hạn {minutesToHHMM(data.depotEndWindow)}
                      </Tag>
                    )}
                    <Tag color={data.routeGeometry ? 'blue' : 'orange'}>
                      {data.routeGeometry
                        ? `Đường thật (OSRM — ${data.routeGeometry.length} điểm)`
                        : 'Đường thẳng (không có OSRM)'}
                    </Tag>
                  </Space>
                </Space>
              ) : (
                <Text type="secondary">Chưa có kết quả.</Text>
              )}
            </Card>
          </Col>
        </Row>

        <Card title="Lộ trình chi tiết (gồm điểm xuất phát + lên xe khách chính)">
          <Table<TableRow>
            size="small"
            rowKey="key"
            dataSource={buildTableRows(data)}
            pagination={false}
            loading={loading}
            onRow={(row) => ({
              style:
                row.kind === 'depot-start' || row.kind === 'depot-end'
                  ? { background: '#fff7e6' }
                  : undefined,
            })}
            columns={[
              {
                title: '#',
                render: (_v, row, idx) =>
                  row.kind === 'depot-start' ? (
                    <Tag color="red">XP</Tag>
                  ) : row.kind === 'depot-end' ? (
                    <Tag color="red">VỀ</Tag>
                  ) : (
                    idx
                  ),
                width: 64,
              },
              {
                title: 'Điểm',
                dataIndex: 'label',
                render: (label: string, row) =>
                  row.kind === 'customer' ? (
                    label
                  ) : (
                    <Text strong>{label}</Text>
                  ),
              },
              {
                title: 'Đến',
                dataIndex: 'arrivalTime',
                render: (v: number, row) => {
                  if (row.kind === 'depot-start') return '—';
                  const text = minutesToHHMM(v);
                  return row.isLate ? (
                    <Text type="danger" strong>
                      {text} ⚠
                    </Text>
                  ) : (
                    text
                  );
                },
                width: 90,
              },
              {
                title: 'Rời',
                dataIndex: 'departureTime',
                render: (v: number, row) =>
                  row.kind === 'depot-end' ? '—' : minutesToHHMM(v),
                width: 80,
              },
              {
                title: 'Quãng trước (km)',
                dataIndex: 'distanceFromPrev',
                render: (v: number, row) =>
                  row.kind === 'depot-start' ? '—' : v.toFixed(2),
                width: 140,
              },
              {
                title: 'Tọa độ',
                dataIndex: 'coordinates',
                render: (c: [number, number]) =>
                  `${c[1].toFixed(4)}, ${c[0].toFixed(4)}`,
              },
            ]}
          />
        </Card>
      </Space>
    </div>
  );
}
