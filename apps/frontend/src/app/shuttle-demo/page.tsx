import type { Metadata } from 'next';
import ShuttleDemoView from './ShuttleDemoView';

export const metadata: Metadata = {
  title: 'Shuttle Optimizer Demo',
  description:
    'Trực quan hóa kết quả bài toán TSPTW 1 xe shuttle đón 10 khách ở TPHCM',
};

export default function ShuttleDemoPage() {
  return <ShuttleDemoView />;
}
