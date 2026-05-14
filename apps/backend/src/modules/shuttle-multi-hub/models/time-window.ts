export interface TimeWindow {
  earliest: number;
  latest: number;
}

export function waitTime(arrivalTime: number, window: TimeWindow): number {
  return Math.max(0, window.earliest - arrivalTime);
}

export function isLate(arrivalTime: number, window: TimeWindow): boolean {
  return arrivalTime > window.latest;
}
