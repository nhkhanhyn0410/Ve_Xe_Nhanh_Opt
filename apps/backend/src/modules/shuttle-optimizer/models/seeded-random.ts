/**
 * PRNG seedable Mulberry32 — không phụ thuộc lib, chất lượng đủ cho mô phỏng,
 * chu kỳ 2^32. Dùng để reproducible: cùng seed → cùng dãy số.
 *
 * Tham khảo: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
 *
 * Dùng chung cho:
 *   - InstanceGenerator (sinh tọa độ + time window)
 *   - SimulatedAnnealingSolver (chọn move + acceptance probabilistic)
 *   - AntColonySolver (chọn cạnh theo roulette wheel)
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0; // ép unsigned 32-bit
  }

  /** Sinh số thực [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Số thực Uniform[min, max) */
  uniform(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Số nguyên Uniform trong [min, max] (cả 2 đầu mút). */
  randInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}
