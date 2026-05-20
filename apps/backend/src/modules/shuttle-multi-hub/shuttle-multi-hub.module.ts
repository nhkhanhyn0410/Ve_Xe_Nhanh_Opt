import { Module } from '@nestjs/common';
import { OsrmDistanceMatrixService } from '../shuttle-optimizer/distance/osrm-distance-matrix.service';
import { MultiHubInstanceGenerator } from './benchmark/instance-generator';
import { AcoTwoOptMdvrptwSolver } from './solvers/aco-two-opt-mdvrptw.solver';
import { AcoTwoOptVrptwSolver } from './solvers/aco-two-opt-vrptw.solver';
import { TwoOptVrptwSolver } from './solvers/two-opt-vrptw.solver';
import { ShuttleMultiHubController } from './shuttle-multi-hub.controller';
import { ShuttleMultiHubService } from './shuttle-multi-hub.service';

@Module({
  controllers: [ShuttleMultiHubController],
  providers: [
    ShuttleMultiHubService,
    OsrmDistanceMatrixService,
    MultiHubInstanceGenerator,
    TwoOptVrptwSolver,
    AcoTwoOptVrptwSolver,
    AcoTwoOptMdvrptwSolver,
  ],
  exports: [ShuttleMultiHubService],
})
export class ShuttleMultiHubModule {}
