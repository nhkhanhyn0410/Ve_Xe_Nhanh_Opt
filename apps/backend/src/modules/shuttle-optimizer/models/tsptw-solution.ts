/**
 * Nghiệm của bài toán TSPTW.
 *
 * Chú ý: `route` là danh sách CUSTOMER INDEX (1..N), KHÔNG bao gồm depot.
 * Depot xuất phát và depot kết thúc được ngầm hiểu ở đầu/cuối route.
 * Ví dụ với N=4 customer, route = [2, 0, 3, 1] nghĩa là:
 *   depot → customers[2] → customers[0] → customers[3] → customers[1] → endDepot
 */
export interface TSPTWSolution {
  /** Thứ tự visit customer (0-indexed vào mảng customers) */
  route: number[];
  /** Tổng quãng đường (km) */
  totalDistance: number;
  /** Tổng thời gian (phút), đã bao gồm di chuyển + wait + service */
  totalDuration: number;
  /** Nghiệm có khả thi không (không vi phạm time window nào) */
  isFeasible: boolean;
  /** Số customer bị vi phạm time window */
  violationCount: number;
  /** Thời gian đến từng customer (phút từ 00:00), cùng thứ tự với `route` */
  arrivalTimes: number[];
  /** Tên solver đã sinh ra nghiệm này */
  solverName: string;
  /** Runtime của solver (ms) — để benchmark */
  runtimeMs: number;
}

/**
 * Tạo nghiệm rỗng (để solver dễ khởi tạo).
 */
export function emptySolution(solverName: string): TSPTWSolution {
  return {
    route: [],
    totalDistance: 0,
    totalDuration: 0,
    isFeasible: false,
    violationCount: 0,
    arrivalTimes: [],
    solverName,
    runtimeMs: 0,
  };
}
