import type { Metadata } from 'next';
import ShuttleBenchView from './ShuttleBenchView';

export const metadata: Metadata = {
  title: 'Shuttle Bench — So sánh 6 solver TSPTW',
  description:
    'Chạy benchmark 6 solver × nhiều N × nhiều seed, so sánh distance, runtime, ' +
    'feasibility rate, optimality gap để chọn solver tốt nhất cho báo cáo AI.',
};

export default function ShuttleBenchPage() {
  return <ShuttleBenchView />;
}
