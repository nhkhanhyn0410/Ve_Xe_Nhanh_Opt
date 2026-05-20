import { Injectable } from '@nestjs/common';
import { BaseAcoTwoOptSolver } from './aco-two-opt-vrptw.solver';
import { TwoOptVrptwSolver } from './two-opt-vrptw.solver';

@Injectable()
export class AcoTwoOptMdvrptwSolver extends BaseAcoTwoOptSolver {
  readonly name = 'aco-2opt-mdvrptw';
  protected readonly expectedMode = 'mdvrptw' as const;

  constructor(twoOpt: TwoOptVrptwSolver) {
    super(twoOpt);
  }
}
