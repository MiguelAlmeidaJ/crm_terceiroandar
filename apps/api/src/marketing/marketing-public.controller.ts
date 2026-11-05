import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { MarketingLeadService } from './marketing-lead.service';

@Controller('public/campaigns')
export class MarketingPublicController {
 constructor(private readonly leads:MarketingLeadService){}
 @Get(':token')
 form(@Param('token') token:string){return this.leads.publicCampaign(token);}
 @Post(':token/leads')
 submit(@Param('token') token:string,@Body() body:unknown,@Req() req:Request){
  return this.leads.capture(token,body,req.ip||'unknown');
 }
}
