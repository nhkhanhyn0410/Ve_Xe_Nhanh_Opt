'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Alert,
  Button,
  Card,
  Col,
  InputNumber,
  Radio,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { MapStep, ShuttleBranch } from './ShuttleMultiHubMap';

const { Title, Text } = Typography;

const ShuttleMultiHubMap = dynamic(() => import('./ShuttleMultiHubMap'), {
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

type MultiHubMode = 'vrptw' | 'mdvrptw';
type DataSource = 'seed' | 'random';

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface MultiHubStep extends MapStep {
  timeWindow: [number, number];
}

interface MultiHubRoute {
  vehicleId: string;
  vehicleName: string;
  color: string;
  depotName: string;
  depotCoordinates: [number, number];
  endDepotName: string;
  endDepotCoordinates: [number, number];
  customerCount: number;
  load: number;
  totalDistance: number;
  totalDuration: number;
  depotArrivalTime: number;
  isFeasible: boolean;
  violationCount: number;
  steps: MultiHubStep[];
  routeGeometry?: [number, number][];
}

interface MultiHubResponse {
  solverName: string;
  mode: MultiHubMode;
  depotCount: number;
  vehicleCount: number;
  customerCount: number;
  totalDistance: number;
  totalDuration: number;
  isFeasible: boolean;
  violationCount: number;
  runtimeMs: number;
  unassignedCustomerIds: string[];
  routes: MultiHubRoute[];
}

interface DemoParams {
  mode: MultiHubMode;
  customerCount: number;
  vehicleCount: number;
  radiusKm: number;
  windowWidth: number;
  depotEnd: number;
  seed: number;
}

interface RouteTableRow {
  key: string;
  vehicleName: string;
  hub: string;
  stops: number;
  load: number;
  totalDistance: number;
  totalDuration: number;
  depotArrivalTime: number;
  violationCount: number;
  isFeasible: boolean;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5501/api/v1';

const DEFAULT_PARAMS: DemoParams = {
  mode: 'mdvrptw',
  customerCount: 14,
  vehicleCount: 2,
  radiusKm: 7,
  windowWidth: 55,
  depotEnd: 430,
  seed: 42,
};

function minutesToHHMM(min: number): string {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function toBranches(data: MultiHubResponse | null): ShuttleBranch[] {
  if (!data) return [];
  return data.routes.map((route) => ({
    depot: route.depotCoordinates,
    depotName: route.depotName,
    endDepot: route.endDepotCoordinates,
    endDepotName: route.endDepotName,
    vehicleName: route.vehicleName,
    steps: route.steps,
    routeGeometry: route.routeGeometry,
    color: route.color,
  }));
}

function toRouteRows(data: MultiHubResponse | null): RouteTableRow[] {
  if (!data) return [];
  return data.routes.map((route) => ({
    key: route.vehicleId,
    vehicleName: route.vehicleName,
    // LUÔN hiển thị explicit "from → to" để debug VRPTW (kể cả khi cùng depot)
    hub: `${route.depotName} → ${route.endDepotName}`,
    stops: route.customerCount,
    load: route.load,
    totalDistance: route.totalDistance,
    totalDuration: route.totalDuration,
    depotArrivalTime: route.depotArrivalTime,
    violationCount: route.violationCount,
    isFeasible: route.isFeasible,
  }));
}

interface MainRouteResponse {
  from: [number, number];
  to: [number, number];
  geometry: [number, number][] | null;
}

export default function ShuttleMultiHubView() {
  const [source, setSource] = useState<DataSource>('seed');
  const [params, setParams] = useState<DemoParams>(DEFAULT_PARAMS);
  const [data, setData] = useState<MultiHubResponse | null>(null);
  const [mainRoute, setMainRoute] = useState<MainRouteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tuyến chính 1 lần khi mount — không phụ thuộc params
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/shuttle-multi-hub/main-route`);
        if (!res.ok) return;
        const json = (await res.json()) as
          | Envelope<MainRouteResponse>
          | MainRouteResponse;
        const payload =
          'success' in json && json.success && 'data' in json
            ? json.data
            : (json as MainRouteResponse);
        if (!cancelled) setMainRoute(payload);
      } catch {
        // Im lặng — map sẽ fallback đường thẳng
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchData = useCallback(
    async (src: DataSource, nextParams: DemoParams) => {
      setLoading(true);
      setError(null);
      try {
        const url =
          src === 'seed'
            ? `${API_BASE}/shuttle-multi-hub/seed?mode=${nextParams.mode}`
            : (() => {
                const query = new URLSearchParams({
                  mode: nextParams.mode,
                  n: String(nextParams.customerCount),
                  vehicles: String(nextParams.vehicleCount),
                  radius: String(nextParams.radiusKm),
                  window: String(nextParams.windowWidth),
                  depotEnd: String(nextParams.depotEnd),
                  seed: String(nextParams.seed),
                });
                return `${API_BASE}/shuttle-multi-hub/demo?${query}`;
              })();
        const res = await fetch(url, { method: 'GET' });
        const json = (await res.json()) as
          | Envelope<MultiHubResponse>
          | MultiHubResponse;
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
            : (json as MultiHubResponse);
        setData(payload);
      } catch (e) {
        setData(null);
        setError(e instanceof Error ? e.message : 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchData(source, params);
    // Chỉ refetch khi source hoặc mode đổi — không re-fetch khi user gõ vào
    // các input random (chờ user bấm "Chạy solver" / "Sinh + Giải").
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, params.mode, fetchData]);

  const branches = useMemo(() => toBranches(data), [data]);
  const routeRows = useMemo(() => toRouteRows(data), [data]);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>
            Shuttle Multi-Hub — VRPTW / MDVRPTW
          </Title>
          <Text type="secondary">
            {data
              ? `${data.solverName} · ${data.customerCount} khách · ${data.vehicleCount} xe · ${data.depotCount} depot`
              : 'Đang tải dữ liệu mô phỏng...'}
          </Text>
        </div>

        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
              <Text strong>Nguồn data:</Text>
              <Radio.Group
                value={source}
                onChange={(e) => setSource(e.target.value as DataSource)}
                disabled={loading}
              >
                <Radio.Button value="seed">
                  Seed cố định (10 khách TPHCM)
                </Radio.Button>
                <Radio.Button value="random">Random instance</Radio.Button>
              </Radio.Group>
            </Space>

            <Space wrap>
              <Text strong>Mô hình:</Text>
              <Radio.Group
                value={params.mode}
                onChange={(e) =>
                  setParams({
                    ...params,
                    mode: e.target.value as MultiHubMode,
                  })
                }
                disabled={loading}
              >
                <Radio.Button value="vrptw">VRPTW thuần</Radio.Button>
                <Radio.Button value="mdvrptw">MDVRPTW</Radio.Button>
              </Radio.Group>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void fetchData(source, params)}
                loading={loading}
              >
                Chạy solver
              </Button>
            </Space>

            {source === 'random' && (
              <Space wrap size={[16, 8]}>
              <Space>
                <Text>Khách:</Text>
                <InputNumber
                  min={2}
                  max={40}
                  value={params.customerCount}
                  onChange={(value) =>
                    value !== null &&
                    setParams({ ...params, customerCount: value })
                  }
                  disabled={loading}
                  style={{ width: 80 }}
                />
              </Space>
              <Space>
                <Text>Xe:</Text>
                <InputNumber
                  min={1}
                  max={6}
                  value={params.vehicleCount}
                  onChange={(value) =>
                    value !== null &&
                    setParams({ ...params, vehicleCount: value })
                  }
                  disabled={loading}
                  style={{ width: 80 }}
                />
              </Space>
              <Space>
                <Text>Bán kính (km):</Text>
                <InputNumber
                  min={2}
                  max={25}
                  value={params.radiusKm}
                  onChange={(value) =>
                    value !== null && setParams({ ...params, radiusKm: value })
                  }
                  disabled={loading}
                  style={{ width: 80 }}
                />
              </Space>
              <Space>
                <Text>Window:</Text>
                <InputNumber
                  min={20}
                  max={180}
                  step={5}
                  value={params.windowWidth}
                  onChange={(value) =>
                    value !== null &&
                    setParams({ ...params, windowWidth: value })
                  }
                  disabled={loading}
                  style={{ width: 80 }}
                />
              </Space>
              <Space>
                <Text>Hạn depot:</Text>
                <InputNumber
                  min={360}
                  max={720}
                  value={params.depotEnd}
                  onChange={(value) =>
                    value !== null && setParams({ ...params, depotEnd: value })
                  }
                  disabled={loading}
                  style={{ width: 90 }}
                />
              </Space>
              <Space>
                <Text>Seed:</Text>
                <InputNumber
                  value={params.seed}
                  onChange={(value) =>
                    value !== null && setParams({ ...params, seed: value })
                  }
                  disabled={loading}
                  style={{ width: 100 }}
                />
                <Button
                  size="small"
                  icon={<ThunderboltOutlined />}
                  onClick={() =>
                    setParams({
                      ...params,
                      seed: Math.floor(Math.random() * 1_000_000),
                    })
                  }
                  disabled={loading}
                  title="Random seed mới"
                />
              </Space>
              </Space>
            )}
          </Space>
        </Card>

        {error && (
          <Alert
            type="error"
            showIcon
            message="Không gọi được API /shuttle-multi-hub/demo"
            description={
              <>
                <div>{error}</div>
                <Text type="secondary">
                  Kiểm tra backend đang chạy tại {API_BASE}.
                </Text>
              </>
            }
          />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              title="Bản đồ tuyến chính + route shuttle"
              styles={{ body: { padding: 0 } }}
              style={{ height: 600, overflow: 'hidden' }}
            >
              <div style={{ height: 550 }}>
                {branches.length > 0 ? (
                  <ShuttleMultiHubMap
                    branches={branches}
                    mainRouteGeometry={mainRoute?.geometry ?? undefined}
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

          <Col xs={24} lg={8}>
            <Card title="Kết quả" style={{ height: 600, overflow: 'auto' }}>
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
                        title="Runtime (ms)"
                        value={data.runtimeMs}
                      />
                    </Col>
                  </Row>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Statistic
                        title="Tổng thời gian"
                        value={data.totalDuration}
                        precision={1}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Vi phạm"
                        value={data.violationCount}
                        valueStyle={{
                          color: data.violationCount > 0 ? '#cf1322' : '#3f8600',
                        }}
                      />
                    </Col>
                  </Row>
                  <Space wrap>
                    <Tag color={data.mode === 'mdvrptw' ? 'purple' : 'blue'}>
                      {data.mode.toUpperCase()}
                    </Tag>
                    <Tag color={data.isFeasible ? 'green' : 'red'}>
                      {data.isFeasible ? 'FEASIBLE' : 'INFEASIBLE'}
                    </Tag>
                    {data.unassignedCustomerIds.length > 0 && (
                      <Tag color="red">
                        Unassigned: {data.unassignedCustomerIds.length}
                      </Tag>
                    )}
                  </Space>
                </Space>
              ) : (
                <Text type="secondary">Chưa có kết quả.</Text>
              )}
            </Card>
          </Col>
        </Row>

        <Card title="Route theo xe (mở rộng để xem thứ tự đón từng xe)">
          <Table<RouteTableRow>
            size="small"
            rowKey="key"
            dataSource={routeRows}
            pagination={false}
            loading={loading}
            expandable={{
              expandedRowRender: (row) => {
                const route = data?.routes.find((r) => r.vehicleId === row.key);
                if (!route) return null;
                if (route.steps.length === 0) {
                  return (
                    <Text type="secondary">
                      Xe này không được phân công khách nào.
                    </Text>
                  );
                }

                // Build rows: XP depot → N customers → VỀ depot
                type DetailRow = {
                  key: string;
                  kind: 'depot-start' | 'customer' | 'depot-end';
                  label: string;
                  arrivalTime: number;
                  departureTime: number;
                  distanceFromPrev: number;
                  coordinates: [number, number];
                  timeWindow?: [number, number];
                  isLate?: boolean;
                };
                const firstStep = route.steps[0];
                const lastStep = route.steps[route.steps.length - 1];
                const detailRows: DetailRow[] = [
                  {
                    key: `${row.key}-depot-start`,
                    kind: 'depot-start',
                    label: `${route.depotName} (xuất phát)`,
                    arrivalTime: 0,
                    // Giờ rời depot = arrival của khách đầu - duration leg đầu.
                    // Không có sẵn → để empty, hiển thị "—"
                    departureTime: firstStep ? firstStep.arrivalTime : 0,
                    distanceFromPrev: 0,
                    coordinates: route.depotCoordinates,
                  },
                  ...route.steps.map((s, idx) => ({
                    key: `${row.key}-${s.customerId}`,
                    kind: 'customer' as const,
                    label: `${idx + 1}. ${s.customerName}`,
                    arrivalTime: s.arrivalTime,
                    departureTime: s.departureTime,
                    distanceFromPrev: s.distanceFromPrev,
                    coordinates: s.coordinates,
                    timeWindow: s.timeWindow,
                    isLate: s.arrivalTime > s.timeWindow[1],
                  })),
                  {
                    key: `${row.key}-depot-end`,
                    kind: 'depot-end',
                    label: `${route.endDepotName} (về bến, lên xe khách chính)`,
                    arrivalTime: route.depotArrivalTime,
                    departureTime: 0,
                    distanceFromPrev:
                      route.totalDistance -
                      route.steps.reduce(
                        (sum, s) => sum + s.distanceFromPrev,
                        0,
                      ),
                    coordinates: route.endDepotCoordinates,
                    isLate: false,
                  },
                ];
                void lastStep; // (giữ reference, có thể dùng để compute thêm sau)

                return (
                  <Table<DetailRow>
                    size="small"
                    pagination={false}
                    rowKey="key"
                    dataSource={detailRows}
                    onRow={(r) => ({
                      style:
                        r.kind !== 'customer'
                          ? { background: '#fff7e6' }
                          : undefined,
                    })}
                    columns={[
                      {
                        title: '#',
                        width: 56,
                        render: (_, r) =>
                          r.kind === 'depot-start' ? (
                            <Tag color="red">XP</Tag>
                          ) : r.kind === 'depot-end' ? (
                            <Tag color="red">VỀ</Tag>
                          ) : (
                            <Tag color={route.color}>
                              {detailRows
                                .filter((x) => x.kind === 'customer')
                                .indexOf(r) + 1}
                            </Tag>
                          ),
                      },
                      {
                        title: 'Điểm',
                        dataIndex: 'label',
                        render: (label: string, r) =>
                          r.kind === 'customer' ? (
                            label
                          ) : (
                            <Text strong>{label}</Text>
                          ),
                      },
                      {
                        title: 'TW yêu cầu',
                        dataIndex: 'timeWindow',
                        width: 130,
                        render: (tw?: [number, number]) =>
                          tw
                            ? `${minutesToHHMM(tw[0])} – ${minutesToHHMM(tw[1])}`
                            : '—',
                      },
                      {
                        title: 'Đến',
                        dataIndex: 'arrivalTime',
                        width: 80,
                        render: (v: number, r) => {
                          if (r.kind === 'depot-start') return '—';
                          const txt = minutesToHHMM(v);
                          return r.isLate ? (
                            <Text type="danger" strong>
                              {txt} ⚠
                            </Text>
                          ) : (
                            txt
                          );
                        },
                      },
                      {
                        title: 'Rời',
                        dataIndex: 'departureTime',
                        width: 80,
                        render: (v: number, r) =>
                          r.kind === 'depot-end' ? '—' : minutesToHHMM(v),
                      },
                      {
                        title: 'Quãng trước (km)',
                        dataIndex: 'distanceFromPrev',
                        width: 140,
                        render: (v: number, r) =>
                          r.kind === 'depot-start' ? '—' : v.toFixed(2),
                      },
                      {
                        title: 'Tọa độ',
                        dataIndex: 'coordinates',
                        render: (c: [number, number]) =>
                          `${c[1].toFixed(4)}, ${c[0].toFixed(4)}`,
                      },
                    ]}
                  />
                );
              },
              rowExpandable: (row) => row.stops > 0,
              defaultExpandAllRows: true,
            }}
            columns={[
              {
                title: 'Xe',
                dataIndex: 'vehicleName',
                render: (name: string, row) => (
                  <Space>
                    <Text strong>{name}</Text>
                    <Tag color={row.isFeasible ? 'green' : 'red'}>
                      {row.violationCount}
                    </Tag>
                  </Space>
                ),
              },
              {
                title: 'Depot',
                dataIndex: 'hub',
              },
              {
                title: 'Stops',
                dataIndex: 'stops',
                width: 80,
              },
              {
                title: 'Load',
                dataIndex: 'load',
                width: 80,
              },
              {
                title: 'Quãng (km)',
                dataIndex: 'totalDistance',
                render: (v: number) => v.toFixed(2),
                width: 110,
              },
              {
                title: 'Thời gian',
                dataIndex: 'totalDuration',
                render: (v: number) => v.toFixed(1),
                width: 100,
              },
              {
                title: 'Về depot',
                dataIndex: 'depotArrivalTime',
                render: (v: number) => minutesToHHMM(v),
                width: 100,
              },
            ]}
          />
        </Card>
      </Space>
    </div>
  );
}

export type { MapStep, ShuttleBranch };
