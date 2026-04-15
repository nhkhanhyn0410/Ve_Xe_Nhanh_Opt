import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO cho 1 customer trong request solve.
 */
export class CustomerInputDto {
  @ApiProperty({ example: 'customer-01' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Nguyễn Văn A - Q1' })
  @IsString()
  name!: string;

  @ApiProperty({ example: [106.6958, 10.7762], description: '[lng, lat]' })
  @IsArray()
  coordinates!: [number, number];

  @ApiProperty({
    example: 360,
    description: 'Thời gian sớm nhất đón (phút từ 00:00)',
  })
  @IsInt()
  @Min(0)
  earliestPickup!: number;

  @ApiProperty({
    example: 390,
    description: 'Thời gian muộn nhất đón (phút từ 00:00)',
  })
  @IsInt()
  @Min(0)
  latestPickup!: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Thời gian dừng phục vụ (phút)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  serviceTime?: number;
}

/**
 * Request body cho endpoint POST /shuttle-optimizer/solve.
 */
export class SolveRequestDto {
  @ApiProperty({ type: CustomerInputDto })
  @ValidateNested()
  @Type(() => CustomerInputDto)
  depot!: CustomerInputDto;

  @ApiProperty({ type: [CustomerInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerInputDto)
  customers!: CustomerInputDto[];

  @ApiProperty({
    example: 300,
    description: 'Giờ xe shuttle xuất phát (phút từ 00:00)',
  })
  @IsInt()
  depotStartTime!: number;

  @ApiProperty({
    example: 420,
    description: 'Giờ xe khách chính khởi hành — hạn về depot',
  })
  @IsInt()
  depotEndTime!: number;

  @ApiPropertyOptional({
    example: 'aco-2opt-hybrid',
    description: 'Solver muốn dùng. Để trống = dùng mặc định',
  })
  @IsOptional()
  @IsString()
  solver?: string;

  @ApiPropertyOptional({ example: 16, description: 'Sức chứa xe shuttle' })
  @IsOptional()
  @IsNumber()
  vehicleCapacity?: number;
}
