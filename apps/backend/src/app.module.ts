import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { OperatorsModule } from './modules/operators/operators.module';

import { StopPointsModule } from './modules/stop-points/stop-points.module';
import { RoutesModule } from './modules/routes/routes.module';
import { BusesModule } from './modules/buses/buses.module';
import { TripsModule } from './modules/trips/trips.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { RedisModule } from './modules/redis/redis.module';
import { OsrmModule } from './modules/osrm/osrm.module';
import { BookingsModule } from '@modules/bookings/bookings.module';
import { SearchModule } from './modules/search/search.module';
import { ShuttleOptimizerModule } from './modules/shuttle-optimizer/shuttle-optimizer.module';
import { ShuttleMultiHubModule } from './modules/shuttle-multi-hub/shuttle-multi-hub.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    OsrmModule,
    UsersModule,
    AuthModule,
    AdminModule,
    OperatorsModule,
    StopPointsModule,
    RoutesModule,
    BusesModule,
    TripsModule,
    EmployeesModule,
    BookingsModule,
    SearchModule,
    ShuttleOptimizerModule,
    ShuttleMultiHubModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
