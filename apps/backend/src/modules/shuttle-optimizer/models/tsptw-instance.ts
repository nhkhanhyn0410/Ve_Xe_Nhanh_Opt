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
 *   - Xe phải đến depot kết thúc trước `depotEndTime` (= giờ xe khách chính chạy)
 *
 * Mục tiêu: tìm thứ tự đón N customer sao cho tổng chi phí (distance hoặc duration)
 * nhỏ nhất, không vi phạm time window nào.
 */
export interface TSPTWInstance {
  /** ID để tra cứu instance trong benchmark */
  id: string;
  /** Depot xuất phát của shuttle. */
  depot: TSPTWNode;
  /**
   * Depot kết thúc (tuỳ chọn). Nếu undefined -> bằng `depot` (closed TSPTW).
   * Nếu có `endDepot` -> bài toán open TSPTW với 2 depot:
   *   - Shuttle xuất phát tại `depot`
   *   - Shuttle kết thúc tại `endDepot`
   *
   * Khi `endDepot` khác `depot`, matrix có kích thước (N+2)×(N+2):
   *   - Index 0    = depot xuất phát
   *   - Index 1..N = customers
   *   - Index N+1  = endDepot
   */
  endDepot?: TSPTWNode;
  /** Danh sách N customer cần đón */
  customers: TSPTWNode[];
  /**
   * Distance matrix (km).
   *   - Closed TSPTW (endDepot undefined): kích thước (N+1)x(N+1)
   *   - Open TSPTW   (có endDepot):        kích thước (N+2)x(N+2)
   *
   * Index 0 = depot xuất phát, 1..N = customers, (N+1 nếu có) = endDepot.
   */
  distanceMatrix: number[][];
  /**
   * Duration matrix (phút), cùng kích thước với distanceMatrix.
   * Phục vụ tính arrival time có xét giao thông thật (không chỉ = distance / speed).
   */
  durationMatrix: number[][];
  /** Thời gian xe xuất phát khỏi depot (phút từ 00:00) */
  depotStartTime: number;
  /** Hạn chót xe phải đến depot kết thúc */
  depotEndTime: number;
  /** Sức chứa xe shuttle (chưa dùng trong TSPTW thuần, để mở rộng sang VRPTW sau) */
  vehicleCapacity: number;
}

/**
 * Trả về node depot kết thúc thực tế.
 */
export function endDepotNode(instance: TSPTWInstance): TSPTWNode {
  return instance.endDepot ?? instance.depot;
}

/**
 * Trả về index trong matrix của depot kết thúc.
 *   - 0       nếu endDepot không định nghĩa (closed TSPTW)
 *   - N + 1   nếu có endDepot (open TSPTW)
 *
 * Dùng thay cho hardcode `[lastIdx][0]` trong mọi solver - để 1 sửa toàn diện
 * khi cần thêm scenario depot mới.
 */
export function endDepotMatrixIdx(instance: TSPTWInstance): number {
  return instance.endDepot ? instance.customers.length + 1 : 0;
}
