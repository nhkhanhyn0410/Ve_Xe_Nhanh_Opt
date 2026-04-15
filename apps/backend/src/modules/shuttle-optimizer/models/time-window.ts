/**
 * Khung thời gian cho pickup/dropoff của 1 customer.
 * Tất cả thời gian tính bằng PHÚT tính từ 00:00 của ngày dịch vụ.
 * Ví dụ: 6:30 sáng = 390 phút, 7:15 sáng = 435 phút.
 */
export interface TimeWindow {
  /** Thời gian sớm nhất có thể đón (phút từ 00:00) */
  earliest: number;
  /** Thời gian muộn nhất có thể đón (phút từ 00:00) */
  latest: number;
}

/**
 * Kiểm tra thời điểm `time` có nằm trong khung [earliest, latest] không.
 */
export function isInWindow(time: number, window: TimeWindow): boolean {
  return time >= window.earliest && time <= window.latest;
}

/**
 * Trả về số phút PHẢI CHỜ nếu đến sớm hơn `earliest`, ngược lại = 0.
 * Dùng để cộng wait time vào tổng duration của route.
 */
export function waitTime(arrivalTime: number, window: TimeWindow): number {
  return Math.max(0, window.earliest - arrivalTime);
}

/**
 * Kiểm tra có bị TRỄ window không (arrival > latest).
 */
export function isLate(arrivalTime: number, window: TimeWindow): boolean {
  return arrivalTime > window.latest;
}
