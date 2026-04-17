import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ShuttleOptimizerService } from './shuttle-optimizer.service';
import { SolveRequestDto } from './dto/solve-request.dto';
import { SolveResponseDto } from './dto/solve-response.dto';

@ApiTags('Shuttle Optimizer')
@Controller('shuttle-optimizer')
export class ShuttleOptimizerController {
  constructor(
    private readonly shuttleOptimizerService: ShuttleOptimizerService,
  ) {}

  @Get('solvers')
  @ApiOperation({ summary: 'Liệt kê tất cả solver đang có' })
  listSolvers(): { solvers: string[] } {
    return { solvers: this.shuttleOptimizerService.listSolvers() };
  }

  @Get('demo')
  @ApiOperation({
    summary: 'Chạy demo với 10 điểm đón thật ở TPHCM — không cần data hay auth',
    description:
      'Dùng Haversine distance matrix (không cần OSRM). ' +
      'Depot: Bến Xe Miền Đông. 10 customer trải đều các quận TPHCM. ' +
      'Thay solver qua query param ?solver=greedy-nearest-neighbor',
  })
  @ApiQuery({
    name: 'solver',
    required: false,
    description: 'Tên solver. Mặc định: greedy-nearest-neighbor',
  })
  async demo(@Query('solver') solver?: string): Promise<SolveResponseDto> {
    return this.shuttleOptimizerService.buildDemoInstance(solver);
  }

  @Post('solve')
  @ApiOperation({
    summary: 'Giải bài toán TSPTW cho 1 xe shuttle đón N khách',
    description:
      'Default solver: aco-2opt-hybrid. Có thể chọn solver khác qua field `solver` trong request body.',
  })
  async solve(@Body() dto: SolveRequestDto): Promise<SolveResponseDto> {
    return this.shuttleOptimizerService.solve(dto);
  }
}
