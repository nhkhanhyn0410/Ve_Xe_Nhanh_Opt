import { TimeWindow } from './time-window';

/**
 * Một node trong bài toán TSPTW (depot hoặc customer).
 */
export interface TSPTWNode {
  /** ID của node (có thể map ngược về StopPoint hoặc Booking) */
  id: string;
  /** Tên hiển thị (để debug/log) */
  name: string;
  /** Tọa độ [lng, lat] theo chuẩn GeoJSON */
  coordinates: [number, number];
  /** Thời gian dừng để đón/trả khách (phút) */
  serviceTime: number;
  /** Khung thời gian cho phép đón */
  timeWindow: TimeWindow;
}

/**
 * Instance của bài toán TSPTW cho xe shuttle đón khách.
 *
 * Mô hình:
 *   - 1 xe shuttle xuất phát từ depot (bến xe chính)
 *   - Đón lần lượt N customer theo 1 thứ tự nào đó
 *   - Mỗi customer có time window bắt buộc
 *   - Xe phải quay về depot trước `depotEndTime` (= giờ xe khách chính chạy)
 *
 * Mục tiêu: tìm thứ tự đón N customer sao cho tổng chi phí (distance hoặc duration)
 * nhỏ nhất, không vi phạm time window nào.
 */
export interface TSPTWInstance {
  /** ID để tra cứu instance trong benchmark */
  id: string;
  /** Depot — vừa là điểm xuất phát vừa là điểm kết thúc */
  depot: TSPTWNode;
  /** Danh sách N customer cần đón */
  customers: TSPTWNode[];
  /**
   * Distance matrix (km), kích thước (N+1) × (N+1).
   * Index 0 = depot, index 1..N = customers[0..N-1].
   * distanceMatrix[i][j] = quãng đường từ node i đến node j.
   */
  distanceMatrix: number[][];
  /**
   * Duration matrix (phút), cùng kích thước với distanceMatrix.
   * Phục vụ tính arrival time có xét giao thông thật (không chỉ = distance / speed).
   */
  durationMatrix: number[][];
  /** Thời gian xe xuất phát khỏi depot (phút từ 00:00) */
  depotStartTime: number;
  /** Hạn chót xe phải về lại depot */
  depotEndTime: number;
  /** Sức chứa xe shuttle (chưa dùng trong TSPTW thuần, để mở rộng sang VRPTW sau) */
  vehicleCapacity: number;
}
