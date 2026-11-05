import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthRequest } from '../auth/auth.guard';
import { PrismaService } from '../infra/prisma/prisma.service';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('summary')
  async summary(@Req() request:AuthRequest) {
    const user=request.user!;
    const filter=user.role==='SYSTEM' ? {} : {tenantId:user.tenantId ?? 'invalid'};
    const [users, activeUsers, events] = await Promise.all([
      this.prisma.user.count({where:filter}),
      this.prisma.user.count({ where: { ...filter,active: true } }),
      user.role==='SYSTEM' ? this.prisma.systemEvent.count() : this.prisma.auditLog.count({where:{tenantId:user.tenantId ?? 'invalid'}}),
    ]);
    return { users, activeUsers, events };
  }
}
