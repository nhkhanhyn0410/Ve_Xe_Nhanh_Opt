'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Alert, Card, Space, Spin, Tag, Typography } from 'antd';
import type { MapStep, ShuttleBranch } from './ShuttleMultiHubMap';

const { Title, Text, Paragraph } = Typography;

/** Leaflet phải client-only, không SSR */
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

/**
 * TRANG NÀY = nơi tiếp nhận update cho scenario "2 cụm khách + tuyến chính".
 *
 * HIỆN TẠI là skeleton:
 *   - Map đã có RED LINE tuyến chính BXMT ↔ BXMĐ + 2 hub markers
 *   - `branches` ban đầu là empty → map chỉ hiện red line + 2 hub
 *
 * KHI QUYẾT ĐỊNH SCENARIO, bổ sung phần fetch + state vào đây:
 *
 *   Scenario A (2 TSPTW độc lập):
 *     - Fetch GET /shuttle-optimizer/random với 2 depot khác nhau
 *     - Push 2 ShuttleBranch vào state với màu phân biệt (xanh + tím)
 *
 *   Scenario B (1 VRPTW):
 *     - Backend cần thêm endpoint mới (VRPTW solver)
 *     - Parse response → split thành 2 ShuttleBranch theo vehicle index
 *
 *   Scenario C (MDVRPTW):
 *     - Backend cần multi-depot solver
 *     - Parse → mỗi branch là 1 (hub, vehicle, customers) tuple
 */
export default function ShuttleMultiHubView() {
  // State để chứa các branch shuttle — hiện rỗng vì chưa có scenario nào được wire
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [branches, _setBranches] = useState<ShuttleBranch[]>([]);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>
            Shuttle Multi-Hub — Tuyến chính 2 bến
          </Title>
          <Text type="secondary">
            Bến Xe Miền Tây → Bến Xe Miền Đông → Hà Nội.
            <br />
            Mỗi bến có 1 cụm khách cần shuttle đón đến đúng giờ xe chính ghé qua.
          </Text>
        </div>

        <Alert
          type="info"
          showIcon
          message="Đây là trang skeleton — chờ bạn quyết định scenario để wire data"
          description={
            <Paragraph style={{ marginBottom: 0 }}>
              Bạn có thể chọn 1 trong 3 hướng:
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                <li>
                  <Tag color="blue">Scenario A</Tag>
                  <b>2 TSPTW độc lập</b> — mỗi bến 1 shuttle riêng. Dùng được solver hiện có.
                </li>
                <li>
                  <Tag color="purple">Scenario B</Tag>
                  <b>1 VRPTW</b> — 1 bến có 2 shuttle phân công khách. Cần upgrade solver.
                </li>
                <li>
                  <Tag color="magenta">Scenario C</Tag>
                  <b>MDVRPTW</b> — khách chọn bến tùy ý + nhiều shuttle. Cần upgrade nhiều hơn.
                </li>
              </ul>
            </Paragraph>
          }
        />

        <Card
          title="Bản đồ tuyến chính + shuttle (preview)"
          styles={{ body: { padding: 0 } }}
          style={{ height: 600, overflow: 'hidden' }}
        >
          <div style={{ height: 550 }}>
            <ShuttleMultiHubMap branches={branches} />
          </div>
        </Card>

        <Card title="Ghi chú thiết kế">
          <Paragraph>
            <b>Red line trên map</b>: tuyến xe khách chính BXMT → BXMĐ (dashed).
            Đây là cố định trong UI, không phải kết quả thuật toán.
          </Paragraph>
          <Paragraph>
            <b>Marker `T` đỏ</b>: Bến Xe Miền Tây. <b>Marker `Đ` đỏ</b>: Bến Xe
            Miền Đông.
          </Paragraph>
          <Paragraph>
            <b>Khi wire data</b>: state <code>branches</code> sẽ chứa các shuttle
            (mỗi cái có depot + list khách + màu riêng). Map tự render polyline +
            numbered markers cho từng branch.
          </Paragraph>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Tham khảo type <code>ShuttleBranch</code> trong{' '}
            <code>ShuttleMultiHubMap.tsx</code>.
          </Paragraph>
        </Card>
      </Space>
    </div>
  );
}

// Re-export để consumer code dễ import
export type { MapStep, ShuttleBranch };
