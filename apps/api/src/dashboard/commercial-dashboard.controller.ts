import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthRequest } from '../auth/auth.guard';
import { CommercialDashboardService } from './commercial-dashboard.service';

@Controller('dashboard/commercial')
@UseGuards(AuthGuard)
export class CommercialDashboardController {
  constructor(private readonly dashboard: CommercialDashboardService) {}

  @Get()
  overview(
    @Req() request: AuthRequest,
    @Query('period') period?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    return this.dashboard.overview(request.user!, period, ownerId);
  }
}
