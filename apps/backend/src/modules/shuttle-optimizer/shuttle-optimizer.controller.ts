import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
