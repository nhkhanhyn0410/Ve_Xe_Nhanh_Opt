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

  @ApiProperty({ type: [RouteStepDto] })
  steps!: RouteStepDto[];
}
