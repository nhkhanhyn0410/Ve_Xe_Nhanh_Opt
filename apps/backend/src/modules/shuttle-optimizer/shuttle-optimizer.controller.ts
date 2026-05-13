import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ShuttleOptimizerService } from './shuttle-optimizer.service';
import { SolveRequestDto } from './dto/solve-request.dto';
import { SolveResponseDto } from './dto/solve-response.dto';
import {
  BenchmarkConfig,
  BenchmarkReport,
  BenchmarkRunner,
} from './benchmark/benchmark-runner';
import { AcoTuner, AcoTuneConfig, AcoTuneReport } from './benchmark/aco-tuner';

@ApiTags('Shuttle Optimizer')
@Controller('shuttle-optimizer')
export class ShuttleOptimizerController {
  constructor(
    private readonly shuttleOptimizerService: ShuttleOptimizerService,
    private readonly benchmarkRunner: BenchmarkRunner,
    private readonly acoTuner: AcoTuner,
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

  @Get('random')
  @ApiOperation({
    summary: 'Sinh instance ngẫu nhiên rồi giải — phục vụ benchmark',
    description:
      'Sinh N customer ngẫu nhiên trong bán kính radiusKm quanh depot, ' +
      'rồi giải bằng solver được chọn. Cùng seed → cùng instance (reproducible). ' +
      'Phù hợp test scaling + so sánh solver trên data đa dạng.',
  })
  @ApiQuery({
    name: 'n',
    required: false,
    description: 'Số customer (1..30). Mặc định 10',
  })
  @ApiQuery({
    name: 'radius',
    required: false,
    description: 'Bán kính phân bố (km). Mặc định 15',
  })
  @ApiQuery({
    name: 'window',
    required: false,
    description: 'Window width trung bình (phút). Mặc định 60',
  })
  @ApiQuery({
    name: 'depotEnd',
    required: false,
    description: 'Hạn về depot (phút từ 00:00). Mặc định 420 (7:00)',
  })
  @ApiQuery({
    name: 'seed',
    required: false,
    description: 'Random seed. Mặc định Date.now() (mỗi request khác nhau)',
  })
  @ApiQuery({
    name: 'solver',
    required: false,
    description: 'Tên solver. Mặc định: greedy-nearest-neighbor',
  })
  async random(
    @Query('n') n?: string,
    @Query('radius') radius?: string,
    @Query('window') window?: string,
    @Query('depotEnd') depotEnd?: string,
    @Query('seed') seed?: string,
    @Query('solver') solver?: string,
  ): Promise<SolveResponseDto> {
    const customerCount = n ? parseInt(n, 10) : 10;
    if (Number.isNaN(customerCount)) {
      throw new BadRequestException(`n phải là số nguyên (nhận '${n}')`);
    }
    return this.shuttleOptimizerService.solveRandomInstance(
      {
        customerCount,
        radiusKm: radius ? parseFloat(radius) : undefined,
        windowWidthMinutes: window ? parseFloat(window) : undefined,
        depotEndTime: depotEnd ? parseInt(depotEnd, 10) : undefined,
        seed: seed ? parseInt(seed, 10) : undefined,
      },
      solver,
    );
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

  @Post('tune-aco')
  @ApiOperation({
    summary: 'Grid Search hyperparameter cho ACO (α × β × ρ)',
    description:
      'Tune ACO trên N customer cố định × M seed × |α| × |β| × |ρ| configs. ' +
      'Mỗi config chạy M ACO + so với reference (BF nếu N ≤ 12, else OR-Tools) để tính gap. ' +
      'Default: N=10, seeds=[1..5], α∈[0.5,1,2], β∈[2,3,5], ρ∈[0.1,0.2] → 18 configs × 5 seeds = 90 runs ACO. ' +
      'Có thể mất vài phút. Trả về results sorted theo avgGap asc.',
  })
  async tuneAco(@Body() body: AcoTuneConfig): Promise<AcoTuneReport> {
    return this.acoTuner.tune(body);
  }

  @Post('benchmark')
  @ApiOperation({
    summary: 'Chạy benchmark batch — 6 solver × N instance × M seed',
    description:
      'Sinh instance ngẫu nhiên cho từng N trong sizes, từng seed trong seeds, ' +
      'rồi chạy mọi solver trong solverNames trên cùng instance. ' +
      'Trả về aggregates (mean/median/std distance, runtime, optimality gap, feasibility rate). ' +
      'Mặc định: sizes=[5,8,10,12], seeds=[1..5], solvers=tất cả. ' +
      'Có thể mất vài phút khi N lớn — đặt time limit cho solver qua solverConfig.timeLimitMs.',
  })
  async benchmark(@Body() body: BenchmarkConfig): Promise<BenchmarkReport> {
    return this.benchmarkRunner.runConfig(body);
  }
}
