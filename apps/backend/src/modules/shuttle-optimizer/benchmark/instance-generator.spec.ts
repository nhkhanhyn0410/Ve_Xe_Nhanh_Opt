import { InstanceGenerator } from './instance-generator';
import { OsrmDistanceMatrixService } from '../distance/osrm-distance-matrix.service';

describe('InstanceGenerator', () => {
  // Stub OSRM = không khả dụng → service dùng Haversine y như trước.
  const distanceService = new OsrmDistanceMatrixService({
    isAvailable: () => false,
  } as unknown as ConstructorParameters<
    typeof OsrmDistanceMatrixService
  >[0]);
  const gen = new InstanceGenerator(distanceService);

  it('sinh đủ N customer + 1 depot', async () => {
    const inst = await gen.generate({ customerCount: 8, seed: 42 });
    expect(inst.customers).toHaveLength(8);
    expect(inst.depot.id).toBe('gen-depot');
  });

  it('matrix có kích thước (N+1) × (N+1)', async () => {
    const inst = await gen.generate({ customerCount: 5, seed: 42 });
    expect(inst.distanceMatrix).toHaveLength(6);
    expect(inst.durationMatrix).toHaveLength(6);
    inst.distanceMatrix.forEach((row) => expect(row).toHaveLength(6));
    inst.durationMatrix.forEach((row) => expect(row).toHaveLength(6));
  });

  it('matrix có thêm node depot kết thúc khi truyền endDepotCenter', async () => {
    const inst = await gen.generate({
      customerCount: 5,
      seed: 42,
      endDepotCenter: [106.6232, 10.7411],
      endDepotName: 'Bến Xe Miền Tây',
    });

    expect(inst.endDepot?.name).toBe('Bến Xe Miền Tây');
    expect(inst.distanceMatrix).toHaveLength(7);
    expect(inst.durationMatrix).toHaveLength(7);
    inst.distanceMatrix.forEach((row) => expect(row).toHaveLength(7));
    inst.durationMatrix.forEach((row) => expect(row).toHaveLength(7));
  });

  it('matrix đối xứng và đường chéo = 0', async () => {
    const inst = await gen.generate({ customerCount: 6, seed: 42 });
    const n = inst.distanceMatrix.length;
    for (let i = 0; i < n; i++) {
      expect(inst.distanceMatrix[i][i]).toBe(0);
      for (let j = 0; j < n; j++) {
        // Haversine đối xứng — cho phép sai số nhỏ do Math.round
        expect(
          Math.abs(inst.distanceMatrix[i][j] - inst.distanceMatrix[j][i]),
        ).toBeLessThan(0.01);
      }
    }
  });

  it('reproducible: cùng seed → cùng instance', async () => {
    const a = await gen.generate({ customerCount: 5, seed: 12345 });
    const b = await gen.generate({ customerCount: 5, seed: 12345 });
    expect(a.customers.map((c) => c.coordinates)).toEqual(
      b.customers.map((c) => c.coordinates),
    );
    expect(a.customers.map((c) => c.timeWindow)).toEqual(
      b.customers.map((c) => c.timeWindow),
    );
  });

  it('khác seed → khác instance', async () => {
    const a = await gen.generate({ customerCount: 5, seed: 1 });
    const b = await gen.generate({ customerCount: 5, seed: 2 });
    // Ít nhất 1 customer phải khác tọa độ
    const allSame = a.customers.every((c, i) => {
      const o = b.customers[i].coordinates;
      return c.coordinates[0] === o[0] && c.coordinates[1] === o[1];
    });
    expect(allSame).toBe(false);
  });

  it('time window nằm trong [depotStart, depotEnd]', async () => {
    const inst = await gen.generate({
      customerCount: 10,
      depotStartTime: 300,
      depotEndTime: 420,
      seed: 42,
    });
    inst.customers.forEach((c) => {
      expect(c.timeWindow.earliest).toBeGreaterThanOrEqual(300);
      expect(c.timeWindow.latest).toBeLessThanOrEqual(420);
      expect(c.timeWindow.earliest).toBeLessThan(c.timeWindow.latest);
    });
  });

  it('customer trong bán kính ~ radiusKm (cộng dung sai làm tròn)', async () => {
    const radiusKm = 10;
    const inst = await gen.generate({
      customerCount: 30,
      radiusKm,
      seed: 7,
    });
    // Tất cả customer phải cách depot ≤ radiusKm × 1.05 (dung sai làm tròn)
    inst.customers.forEach((c) => {
      const dKm = inst.distanceMatrix[0][inst.customers.indexOf(c) + 1];
      // dKm tính bằng road distance × 1.35 → nhân ngược để có haversine xấp xỉ
      // Chỉ cần check không quá 1.5 × radius là đủ
      expect(dKm).toBeLessThan(radiusKm * 1.5);
    });
  });

  it('throw khi customerCount < 1', async () => {
    await expect(gen.generate({ customerCount: 0 })).rejects.toThrow(
      /≥·1|customerCount/,
    );
  });

  it('throw khi customerCount > 30', async () => {
    await expect(gen.generate({ customerCount: 31 })).rejects.toThrow(
      /30|customerCount/,
    );
  });

  it('throw khi khung depot quá hẹp so với windowWidth', async () => {
    await expect(
      gen.generate({
        customerCount: 5,
        depotStartTime: 300,
        depotEndTime: 350, // chỉ 50 phút
        windowWidthMinutes: 60, // window rộng hơn cả khung
      }),
    ).rejects.toThrow(/hẹp|nới|windowWidth/);
  });

  it('id chứa thông tin reproduce', async () => {
    const inst = await gen.generate({
      customerCount: 7,
      radiusKm: 12,
      windowWidthMinutes: 40,
      seed: 99,
    });
    expect(inst.id).toContain('N7');
    expect(inst.id).toContain('r12');
    expect(inst.id).toContain('w40');
    expect(inst.id).toContain('s99');
  });
});
