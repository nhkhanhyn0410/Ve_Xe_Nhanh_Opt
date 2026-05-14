import { ApiProperty } from '@nestjs/swagger';

/**
 * Thông tin 1 chặng trong route trả về.
 */
export class RouteStepDto {
  @ApiProperty({ example: 'customer-03' })
  customerId!: string;

  @ApiProperty({ example: 'Nguyễn Văn C - Q3' })
  customerName!: string;

  @ApiProperty({ example: [106.6833, 10.7829] })
  coordinates!: [number, number];

  @ApiProperty({ example: 365, description: 'Phút từ 00:00' })
  arrivalTime!: number;

  @ApiProperty({
    example: 368,
    description: 'Phút từ 00:00 — sau khi đón xong',
  })
  departureTime!: number;

  @ApiProperty({ example: 2.3, description: 'Khoảng cách từ node trước (km)' })
  distanceFromPrev!: number;
}

/**
 * Response DTO cho endpoint POST /shuttle-optimizer/solve.
 */
export class SolveResponseDto {
  @ApiProperty({ example: 'aco-2opt-hybrid' })
  solverName!: string;

  @ApiProperty({ example: 18.7, description: 'Tổng quãng đường (km)' })
  totalDistance!: number;

  @ApiProperty({ example: 65, description: 'Tổng thời gian (phút)' })
  totalDuration!: number;

  @ApiProperty({ example: true })
  isFeasible!: boolean;

  @ApiProperty({ example: 0 })
  violationCount!: number;

  @ApiProperty({ example: 1243, description: 'Runtime solver (ms)' })
  runtimeMs!: number;

  @ApiProperty({ example: 'Bến Xe Miền Đông' })
  depotName!: string;

  @ApiProperty({
    example: [10.880216, 106.815484],
    description: 'Tọa độ depot xuất phát [lng, lat]',
  })
  depotCoordinates!: [number, number];

  @ApiProperty({ example: 'Bến Xe Miền Tây' })
  endDepotName!: string;

  @ApiProperty({
    example: [106.6232, 10.7411],
    description: 'Tọa độ depot kết thúc [lng, lat]',
  })
  endDepotCoordinates!: [number, number];

  @ApiProperty({
    example: 300,
    description:
      'Phút từ 00:00 — xe shuttle rời depot (điểm lên xe khách chính)',
  })
  depotDepartureTime!: number;

  @ApiProperty({
    example: 504,
    description:
      'Phút từ 00:00 — xe shuttle đến depot kết thúc. Khách lên xe khách chính ở đây. ' +
      'Nếu > depotEndWindow → khách lỡ chuyến.',
  })
  depotArrivalTime!: number;

  @ApiProperty({
    example: 400,
    description:
      'Phút từ 00:00 — hạn chót về depot (giờ xe khách chính khởi hành)',
  })
  depotEndWindow!: number;

  @ApiProperty({
    example: 4.2,
    description: 'Khoảng cách từ node cuối cùng đến depot kết thúc (km)',
  })
  endDepotDistanceFromPrev!: number;

  @ApiProperty({ type: [RouteStepDto] })
  steps!: RouteStepDto[];

  @ApiProperty({
    required: false,
    description:
      'Polyline đường thật từ OSRM (GeoJSON LineString) — mảng [lng, lat]. ' +
      'Null nếu OSRM không khả dụng; frontend nên fallback sang đường thẳng.',
    example: [
      [10.880216, 106.815484],
      [106.712, 10.815],
      [106.6988, 10.7793],
    ],
  })
  routeGeometry?: [number, number][];
}
