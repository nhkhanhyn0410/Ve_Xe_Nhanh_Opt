import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MultiHubMode } from './models/vrptw-instance';
import { SolveMultiHubRequestDto } from './dto/solve-request.dto';
import { MultiHubSolveResponseDto } from './dto/solve-response.dto';
import { ShuttleMultiHubService } from './shuttle-multi-hub.service';

@ApiTags('Shuttle Multi Hub')
@Controller('shuttle-multi-hub')
export class ShuttleMultiHubController {
  constructor(private readonly service: ShuttleMultiHubService) {}

  @Get('solvers')
  @ApiOperation({ summary: 'List VRPTW/MDVRPTW solvers' })
  listSolvers(): { solvers: string[] } {
    return { solvers: this.service.listSolvers() };
  }

  @Get('seed')
  @ApiOperation({
    summary:
      'Solve a fixed seed instance (10 real TPHCM customers, 2 hubs) — reproducible, no random',
    description:
      'Cụm tây 5 khách quanh BXMT + cụm đông 5 khách quanh BXMĐ. ' +
      'Same input every call → dùng để debug solver hoặc demo ổn định.',
  })
  @ApiQuery({ name: 'mode', required: false, enum: ['vrptw', 'mdvrptw'] })
  @ApiQuery({ name: 'solver', required: false })
  async seed(
    @Query('mode') mode?: string,
    @Query('solver') solver?: string,
  ): Promise<MultiHubSolveResponseDto> {
    const parsedMode = parseMode(mode);
    return this.service.solveSeed(parsedMode, solver);
  }

  @Get('demo')
  @ApiOperation({
    summary:
      'Generate a synthetic VRPTW or MDVRPTW instance and solve it with ACO+2Opt',
  })
  @ApiQuery({ name: 'mode', required: false, enum: ['vrptw', 'mdvrptw'] })
  @ApiQuery({ name: 'n', required: false, description: 'Customer count' })
  @ApiQuery({ name: 'vehicles', required: false, description: 'Vehicle count' })
  @ApiQuery({
    name: 'radius',
    required: false,
    description: 'Cluster radius km',
  })
  @ApiQuery({
    name: 'window',
    required: false,
    description: 'Time-window width minutes',
  })
  @ApiQuery({
    name: 'depotEnd',
    required: false,
    description: 'Depot latest arrival time',
  })
  @ApiQuery({ name: 'seed', required: false })
  @ApiQuery({ name: 'solver', required: false })
  async demo(
    @Query('mode') mode?: string,
    @Query('n') n?: string,
    @Query('vehicles') vehicles?: string,
    @Query('radius') radius?: string,
    @Query('window') window?: string,
    @Query('depotEnd') depotEnd?: string,
    @Query('seed') seed?: string,
    @Query('solver') solver?: string,
  ): Promise<MultiHubSolveResponseDto> {
    const parsedMode = parseMode(mode);
    return this.service.solveDemo(
      {
        mode: parsedMode,
        customerCount: parseOptionalInt('n', n),
        vehicleCount: parseOptionalInt('vehicles', vehicles),
        radiusKm: parseOptionalFloat('radius', radius),
        windowWidthMinutes: parseOptionalFloat('window', window),
        depotEndTime: parseOptionalInt('depotEnd', depotEnd),
        seed: parseOptionalInt('seed', seed),
      },
      solver,
    );
  }

  @Post('solve')
  @ApiOperation({
    summary: 'Solve a custom VRPTW/MDVRPTW instance with ACO+2Opt',
  })
  async solve(
    @Body() dto: SolveMultiHubRequestDto,
  ): Promise<MultiHubSolveResponseDto> {
    return this.service.solve(dto);
  }
}

function parseMode(value?: string): MultiHubMode {
  if (!value) return 'mdvrptw';
  if (value === 'vrptw' || value === 'mdvrptw') return value;
  throw new BadRequestException("mode must be 'vrptw' or 'mdvrptw'");
}

function parseOptionalInt(name: string, value?: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new BadRequestException(`${name} must be an integer`);
  }
  return parsed;
}

function parseOptionalFloat(name: string, value?: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new BadRequestException(`${name} must be a number`);
  }
  return parsed;
}
