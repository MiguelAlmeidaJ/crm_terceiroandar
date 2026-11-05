import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../auth/tenant.guard';
import { AuthGuard, AuthRequest } from '../auth/auth.guard';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(AuthGuard,TenantGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(@Req() req: AuthRequest, @Query('status') status?: string, @Query('assigneeId') assigneeId?: string, @Query('page') page?: string) {
    return this.tasks.list(req.user!, status, assigneeId, page);
  }

  @Get('summary')
  summary(@Req() req: AuthRequest) {
    return this.tasks.summary(req.user!);
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.tasks.create(req.user!, body);
  }

  @Patch(':id')
  update(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.tasks.update(req.user!, id, body);
  }
}
