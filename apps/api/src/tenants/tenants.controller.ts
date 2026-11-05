import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthRequest } from '../auth/auth.guard';
import { SystemGuard } from './system.guard';
import { TenantsService } from './tenants.service';
@Controller('system/companies')
@UseGuards(AuthGuard, SystemGuard)
export class TenantsController {
 constructor(private readonly tenants:TenantsService){}
 @Get() list(){return this.tenants.list();}
 @Post() create(@Body() body:unknown,@Req() request:AuthRequest){return this.tenants.create(body,request.user!.id);}
 @Patch(':id') update(@Param('id') id:string,@Body() body:unknown){return this.tenants.update(id,body);}
}
