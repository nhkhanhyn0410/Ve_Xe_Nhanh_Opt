import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MultiHubMode } from '../models/vrptw-instance';
import { AcoTwoOptConfig } from '../solvers/aco-two-opt-vrptw.solver';

export class MultiHubTimeWindowDto {
  @ApiProperty({ example: 300 })
  @IsInt()
  @Min(0)
  earliest!: number;

  @ApiProperty({ example: 430 })
  @IsInt()
  @Min(0)
  latest!: number;
}

export class MultiHubDepotDto {
  @ApiProperty({ example: 'hub-bxmd' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Ben Xe Mien Dong' })
  @IsString()
  name!: string;

  @ApiProperty({ example: [106.815484, 10.880216], description: '[lng, lat]' })
  @IsArray()
  coordinates!: [number, number];

  @ApiProperty({ type: MultiHubTimeWindowDto })
  @ValidateNested()
  @Type(() => MultiHubTimeWindowDto)
  timeWindow!: MultiHubTimeWindowDto;
}

export class MultiHubCustomerDto {
  @ApiProperty({ example: 'mh-c1' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'West Cluster 1' })
  @IsString()
  name!: string;

  @ApiProperty({ example: [106.6232, 10.7411], description: '[lng, lat]' })
  @IsArray()
  coordinates!: [number, number];

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0)
  serviceTime!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  demand!: number;

  @ApiProperty({ type: MultiHubTimeWindowDto })
  @ValidateNested()
  @Type(() => MultiHubTimeWindowDto)
  timeWindow!: MultiHubTimeWindowDto;

  @ApiPropertyOptional({ example: 'hub-bxmt' })
  @IsOptional()
  @IsString()
  preferredDepotId?: string;
}

export class MultiHubVehicleDto {
  @ApiProperty({ example: 'vehicle-1' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Shuttle 1' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  startDepotIndex!: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  endDepotIndex!: number;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiPropertyOptional({ example: '#2563eb' })
  @IsOptional()
  @IsString()
  color?: string;
}

export class SolveMultiHubRequestDto {
  @ApiProperty({ enum: ['vrptw', 'mdvrptw'], example: 'mdvrptw' })
  @IsIn(['vrptw', 'mdvrptw'])
  mode!: MultiHubMode;

  @ApiProperty({ type: [MultiHubDepotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MultiHubDepotDto)
  depots!: MultiHubDepotDto[];

  @ApiProperty({ type: [MultiHubVehicleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MultiHubVehicleDto)
  vehicles!: MultiHubVehicleDto[];

  @ApiProperty({ type: [MultiHubCustomerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MultiHubCustomerDto)
  customers!: MultiHubCustomerDto[];

  @ApiPropertyOptional({ example: 'aco-2opt-mdvrptw' })
  @IsOptional()
  @IsString()
  solver?: string;

  @ApiPropertyOptional({ description: 'ACO+2Opt runtime parameters' })
  @IsOptional()
  @IsObject()
  solverConfig?: AcoTwoOptConfig;
}
