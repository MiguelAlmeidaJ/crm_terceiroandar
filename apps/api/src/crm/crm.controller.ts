import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthRequest } from '../auth/auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { CrmService } from './crm.service';

@Controller('crm')
@UseGuards(AuthGuard, TenantGuard)
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('contacts')
  contacts(@Req() req:AuthRequest,@Query('q') q?: string, @Query('page') page?: string) { return this.crm.contacts(req.user!,q, page); }

  @Get('contacts/:id')
  contact(@Req() req:AuthRequest,@Param('id') id:string){return this.crm.contact(req.user!,id);}

  @Get('contacts/:id/interactions')
  contactInteractions(@Req() req:AuthRequest,@Param('id') id:string,@Query('page') page?:string){
    return this.crm.contactInteractions(req.user!,id,page);
  }

  @Post('contacts/:id/interactions')
  createInteraction(@Req() req:AuthRequest,@Param('id') id:string,@Body() body:unknown){
    return this.crm.createContactInteraction(req.user!,id,body);
  }

  @Post('contacts')
  createContact(@Req() req:AuthRequest,@Body() body: unknown) { return this.crm.createContact(req.user!,body); }

  @Patch('contacts/:id')
  updateContact(@Req() req:AuthRequest,@Param('id') id: string, @Body() body: unknown) { return this.crm.updateContact(req.user!,id, body); }

  @Get('owners')
  owners(@Req() req:AuthRequest) { return this.crm.owners(req.user!); }

  @Get('kanban')
  kanban(@Req() req:AuthRequest,@Query('ownerId') ownerId?: string, @Query('q') q?: string) { return this.crm.kanban(req.user!,ownerId, q); }

  @Get('opportunities')
  opportunities(@Req() req:AuthRequest,@Query('stage') stage?: string, @Query('page') page?: string) { return this.crm.opportunities(req.user!,stage, page); }

  @Post('opportunities')
  createOpportunity(@Body() body: unknown, @Req() req: AuthRequest) { return this.crm.createOpportunity(req.user!,body); }

  @Patch('opportunities/:id')
  updateOpportunity(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthRequest) { return this.crm.updateOpportunity(req.user!,id, body); }

  @Get('opportunities/:id/activities')
  activities(@Req() req:AuthRequest,@Param('id') id: string) { return this.crm.activities(req.user!,id); }

  @Post('opportunities/:id/activities')
  addActivity(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthRequest) { return this.crm.addActivity(req.user!,id, body); }

  @Get('summary')
  summary(@Req() req:AuthRequest) { return this.crm.summary(req.user!); }
}
