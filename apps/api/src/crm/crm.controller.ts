import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthRequest } from '../auth/auth.guard';
import { CrmService } from './crm.service';

@Controller('crm')
@UseGuards(AuthGuard)
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('contacts')
  contacts(@Query('q') q?: string, @Query('page') page?: string) { return this.crm.contacts(q, page); }

  @Post('contacts')
  createContact(@Body() body: unknown) { return this.crm.createContact(body); }

  @Patch('contacts/:id')
  updateContact(@Param('id') id: string, @Body() body: unknown) { return this.crm.updateContact(id, body); }

  @Get('owners')
  owners() { return this.crm.owners(); }

  @Get('kanban')
  kanban(@Query('ownerId') ownerId?: string, @Query('q') q?: string) { return this.crm.kanban(ownerId, q); }

  @Get('opportunities')
  opportunities(@Query('stage') stage?: string, @Query('page') page?: string) { return this.crm.opportunities(stage, page); }

  @Post('opportunities')
  createOpportunity(@Body() body: unknown, @Req() req: AuthRequest) { return this.crm.createOpportunity(body, req.user!.id); }

  @Patch('opportunities/:id')
  updateOpportunity(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthRequest) { return this.crm.updateOpportunity(id, body, req.user!.id); }

  @Get('opportunities/:id/activities')
  activities(@Param('id') id: string) { return this.crm.activities(id); }

  @Post('opportunities/:id/activities')
  addActivity(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthRequest) { return this.crm.addActivity(id, body, req.user!.id); }

  @Get('summary')
  summary() { return this.crm.summary(); }
}
