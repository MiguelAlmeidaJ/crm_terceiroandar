import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { CommercialDashboardController } from './commercial-dashboard.controller';
import { CommercialDashboardService } from './commercial-dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController, CommercialDashboardController],
  providers: [CommercialDashboardService],
})
export class DashboardModule {}
