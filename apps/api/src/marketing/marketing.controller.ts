import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthRequest } from '../auth/auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { MarketingService } from './marketing.service';

@Controller('marketing')
@UseGuards(AuthGuard,TenantGuard)
export class MarketingController {
 constructor(private readonly marketing:MarketingService){}

 @Get('campaigns')
 list(@Req() req:AuthRequest,@Query('page') page?:string,@Query('status') status?:string,@Query('q') q?:string) {
  return this.marketing.list(req.user!,page,status,q);
 }
 @Get('summary')
 summary(@Req() req:AuthRequest){return this.marketing.summary(req.user!);}
 @Get('campaigns/:id')
 one(@Req() req:AuthRequest,@Param('id') id:string){return this.marketing.one(req.user!,id);}
 @Post('campaigns')
 create(@Req() req:AuthRequest,@Body() body:unknown){return this.marketing.create(req.user!,body);}
 @Patch('campaigns/:id')
 update(@Req() req:AuthRequest,@Param('id') id:string,@Body() body:unknown){return this.marketing.update(req.user!,id,body);}
 @Post('campaigns/:id/contacts')
 link(@Req() req:AuthRequest,@Param('id') id:string,@Body() body:unknown){return this.marketing.linkContact(req.user!,id,body);}
}
