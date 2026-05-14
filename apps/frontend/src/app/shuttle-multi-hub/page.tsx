import type { Metadata } from 'next';
import ShuttleMultiHubView from './ShuttleMultiHubView';

export const metadata: Metadata = {
  title: 'Shuttle Multi-Hub — 2 cụm khách',
  description:
    'Tuyến chính BXMT → BXMĐ → HN. Skeleton để wire scenario sau khi quyết định.',
};

export default function ShuttleMultiHubPage() {
  return <ShuttleMultiHubView />;
}
