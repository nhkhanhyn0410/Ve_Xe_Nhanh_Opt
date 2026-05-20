'use client';

import {
  BarChartOutlined,
  ClusterOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { Segmented, Space, Typography } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const { Text } = Typography;

interface ShuttleRoute {
  value: string;
  label: string;
  icon: ReactNode;
}

const SHUTTLE_ROUTES: ShuttleRoute[] = [
  {
    value: '/shuttle-demo',
    label: 'Demo',
    icon: <EnvironmentOutlined />,
  },
  {
    value: '/shuttle-bench',
    label: 'Bench',
    icon: <BarChartOutlined />,
  },
  {
    value: '/shuttle-multi-hub',
    label: 'Multi-Hub',
    icon: <ClusterOutlined />,
  },
];

function buildOption(route: ShuttleRoute) {
  return {
    value: route.value,
    label: (
      <Space size={6} style={{ whiteSpace: 'nowrap' }}>
        {route.icon}
        <span>{route.label}</span>
      </Space>
    ),
  };
}

export default function ShuttleQuickNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activeRoute = SHUTTLE_ROUTES.find(
    (route) =>
      pathname === route.value || pathname.startsWith(`${route.value}/`),
  );

  if (!activeRoute) return null;

  return (
    <nav
      aria-label="Điều hướng nhanh Shuttle"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid #f0f0f0',
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(8px)',
        padding: '10px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          maxWidth: 1400,
          margin: '0 auto',
          overflowX: 'auto',
        }}
      >
        <Space size={8} style={{ flex: '0 0 auto' }}>
          <ClusterOutlined style={{ color: '#1677ff' }} />
          <Text strong>Shuttle</Text>
        </Space>
        <Segmented
          value={activeRoute.value}
          options={SHUTTLE_ROUTES.map(buildOption)}
          onChange={(value) => router.push(String(value))}
          style={{ flex: '0 0 auto' }}
        />
      </div>
    </nav>
  );
}
