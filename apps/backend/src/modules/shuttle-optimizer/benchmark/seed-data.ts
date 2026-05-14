import { TSPTWInstance } from '../models/tsptw-instance';

/**
 * Dữ liệu demo — 10 điểm đón thực tế ở TPHCM.
 * Shuttle xuất phát tại Bến Xe Miền Tây và kết thúc ở Bến Xe Miền Đông.
 * Xe khách chính khởi hành 7:00 (420 phút).
 * Xe shuttle xuất phát 5:00 (300 phút), phải về trước 6:40 (400 phút).
 *
 * Tọa độ [lng, lat] — chuẩn GeoJSON.
 * Time window tính bằng phút từ 00:00.
 * Dùng để test solver và visualization mà không cần data thật từ DB.
 *
 * distanceMatrix và durationMatrix = rỗng — sẽ được OsrmDistanceMatrixService
 * điền vào khi gọi ShuttleOptimizerService.buildDemoInstance().
 */
export const DEMO_SEED: Omit<
  TSPTWInstance,
  'distanceMatrix' | 'durationMatrix'
> = {
  id: 'demo-tphcm-10-customers',
  depot: {
    id: 'depot-bxmt',
    name: 'Bến Xe Miền Tây',
    coordinates: [106.6232, 10.7411],
    serviceTime: 0,
    timeWindow: { earliest: 300, latest: 420 },
  },
  endDepot: {
    id: 'depot-bxmd',
    name: 'Bến Xe Miền Đông',
    coordinates: [10.880216, 106.815484],
    serviceTime: 0,
    timeWindow: { earliest: 300, latest: 420 },
  },
  customers: [
    {
      id: 'c1',
      name: 'Quận 1 — Nhà thờ Đức Bà',
      coordinates: [106.6988, 10.7793],
      serviceTime: 2,
      timeWindow: { earliest: 330, latest: 360 },
    },
    {
      id: 'c2',
      name: 'Quận 3 — Lê Văn Sỹ',
      coordinates: [106.6822, 10.7843],
      serviceTime: 2,
      timeWindow: { earliest: 315, latest: 355 },
    },
    {
      id: 'c3',
      name: 'Quận 5 — Chợ Lớn',
      coordinates: [106.6624, 10.7561],
      serviceTime: 2,
      timeWindow: { earliest: 320, latest: 370 },
    },
    {
      id: 'c4',
      name: 'Quận 7 — Phú Mỹ Hưng',
      coordinates: [106.7181, 10.7279],
      serviceTime: 2,
      timeWindow: { earliest: 310, latest: 360 },
    },
    {
      id: 'c5',
      name: 'Quận 10 — Nguyễn Tri Phương',
      coordinates: [106.6688, 10.7731],
      serviceTime: 2,
      timeWindow: { earliest: 325, latest: 365 },
    },
    {
      id: 'c6',
      name: 'Bình Thạnh — Ngã tư Hàng Xanh',
      coordinates: [106.7141, 10.8031],
      serviceTime: 2,
      timeWindow: { earliest: 305, latest: 345 },
    },
    {
      id: 'c7',
      name: 'Tân Bình — Sân bay Tân Sơn Nhất',
      coordinates: [106.6527, 10.802],
      serviceTime: 2,
      timeWindow: { earliest: 310, latest: 360 },
    },
    {
      id: 'c8',
      name: 'Thủ Đức — Đại học Quốc gia',
      coordinates: [106.7568, 10.8513],
      serviceTime: 2,
      timeWindow: { earliest: 300, latest: 340 },
    },
    {
      id: 'c9',
      name: 'Quận 12 — Ngã tư Ga',
      coordinates: [106.6448, 10.8647],
      serviceTime: 2,
      timeWindow: { earliest: 300, latest: 345 },
    },
    {
      id: 'c10',
      name: 'Gò Vấp — Quang Trung',
      coordinates: [106.6831, 10.8379],
      serviceTime: 2,
      timeWindow: { earliest: 305, latest: 350 },
    },
  ],
  depotStartTime: 300, // 5:00 sáng
  depotEndTime: 400, // 6:40 sáng — phải về trước giờ xe chính chạy
  vehicleCapacity: 16,
};
