import { ApiProperty } from '@nestjs/swagger';
import { MultiHubMode } from '../models/vrptw-instance';

export class MultiHubRouteStepDto {
  @ApiProperty({ example: 'mh-c1' })
  customerId!: string;

  @ApiProperty({ example: 'West Cluster 1' })
  customerName!: string;

  @ApiProperty({ example: [106.6232, 10.7411], description: '[lng, lat]' })
  coordinates!: [number, number];

  @ApiProperty({ example: 330 })
  arrivalTime!: number;

  @ApiProperty({ example: 334 })
  departureTime!: number;

  @ApiProperty({ example: 3.4 })
  distanceFromPrev!: number;

  @ApiProperty({ example: [310, 365] })
  timeWindow!: [number, number];
}

export class MultiHubVehicleRouteDto {
  @ApiProperty({ example: 'vehicle-1' })
  vehicleId!: string;

  @ApiProperty({ example: 'Shuttle 1' })
  vehicleName!: string;

  @ApiProperty({ example: '#2563eb' })
  color!: string;

  @ApiProperty({ example: 'Ben Xe Mien Tay' })
  depotName!: string;

  @ApiProperty({ example: [106.6232, 10.7411], description: '[lng, lat]' })
  depotCoordinates!: [number, number];

  @ApiProperty({ example: 'Ben Xe Mien Tay' })
  endDepotName!: string;

  @ApiProperty({ example: [106.6232, 10.7411], description: '[lng, lat]' })
  endDepotCoordinates!: [number, number];

  @ApiProperty({ example: 7 })
  customerCount!: number;

  @ApiProperty({ example: 7 })
  load!: number;

  @ApiProperty({ example: 24.5 })
  totalDistance!: number;

  @ApiProperty({ example: 83.2 })
  totalDuration!: number;

  @ApiProperty({ example: 402 })
  depotArrivalTime!: number;

  @ApiProperty({ example: true })
  isFeasible!: boolean;

  @ApiProperty({ example: 0 })
  violationCount!: number;

  @ApiProperty({ type: [MultiHubRouteStepDto] })
  steps!: MultiHubRouteStepDto[];

  @ApiProperty({ required: false, example: [[106.6232, 10.7411]] })
  routeGeometry?: [number, number][];
}

export class MultiHubSolveResponseDto {
  @ApiProperty({ example: 'aco-2opt-mdvrptw' })
  solverName!: string;

  @ApiProperty({ enum: ['vrptw', 'mdvrptw'], example: 'mdvrptw' })
  mode!: MultiHubMode;

  @ApiProperty({ example: 2 })
  depotCount!: number;

  @ApiProperty({ example: 2 })
  vehicleCount!: number;

  @ApiProperty({ example: 14 })
  customerCount!: number;

  @ApiProperty({ example: 52.4 })
  totalDistance!: number;

  @ApiProperty({ example: 162.3 })
  totalDuration!: number;

  @ApiProperty({ example: true })
  isFeasible!: boolean;

  @ApiProperty({ example: 0 })
  violationCount!: number;

  @ApiProperty({ example: 1234 })
  runtimeMs!: number;

  @ApiProperty({ example: [] })
  unassignedCustomerIds!: string[];

  @ApiProperty({ type: [MultiHubVehicleRouteDto] })
  routes!: MultiHubVehicleRouteDto[];
}
