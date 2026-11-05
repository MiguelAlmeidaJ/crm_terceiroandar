import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { MarketingCampaignStatus } from '@prisma/client';
import { PrismaService } from '../infra/prisma/prisma.service';
import { RedisService } from '../infra/redis/redis.service';

@Injectable()
export class MarketingLeadService {
 constructor(private readonly prisma:PrismaService,private readonly redis:RedisService){}

 private string(value:unknown,label:string,min:number,max:number):string {
  if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)
   throw new BadRequestException(label+' inválido');
  return value.trim();
 }
 private optional(value:unknown,label:string,max:number):string|null {
  if(value===undefined||value===null||value==='')return null;
  return this.string(value,label,1,max);
 }
 private async rateLimit(token:string,ip:string,email:string):Promise<void>{
  // Counters are scoped to one public campaign and a hashed key, not to the tenant's other campaigns.
  const checks=[{kind:'ip',value:ip,limit:12},{kind:'email',value:email.toLowerCase(),limit:3}];
  try {
   for(const check of checks){
    const key='ta:lead:v1:'+check.kind+':'+createHash('sha256').update(token+':'+check.value).digest('hex');
    const result=await this.redis.client.multi().incr(key).expire(key,3600,'NX').exec();
    const count=Number(result?.[0]?.[1]);
    if(!Number.isFinite(count))throw new Error('Rate limiter indisponível');
    if(count>check.limit)throw new HttpException('Limite de solicitações excedido. Tente mais tarde.',HttpStatus.TOO_MANY_REQUESTS);
   }
  }catch(error){
   if(error instanceof HttpException)throw error;
   throw new ServiceUnavailableException('Formulário temporariamente indisponível');
  }
 }
 async publicCampaign(token:string){
  if(!/^[0-9a-f-]{36}$/i.test(token))throw new NotFoundException('Formulário indisponível');
  const c=await this.prisma.marketingCampaign.findFirst({
   where:{captureToken:token,captureEnabled:true,status:MarketingCampaignStatus.EM_ANDAMENTO,tenant:{active:true}},
   select:{name:true,description:true,channel:true,tenant:{select:{name:true}}},
  });
  if(!c)throw new NotFoundException('Formulário indisponível');
  return {name:c.name,description:c.description,company:c.tenant.name,channel:c.channel};
 }
 async capture(token:string,input:unknown,ip:string){
  if(!/^[0-9a-f-]{36}$/i.test(token))throw new NotFoundException('Formulário indisponível');
  if(!input||typeof input!=='object'||Array.isArray(input))throw new BadRequestException('Dados inválidos');
  const body=input as Record<string,unknown>;
  const allowed=['name','email','phone','consent','website','utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  if(Object.keys(body).some(k=>!allowed.includes(k)))throw new BadRequestException('Campos desconhecidos');
  const campaign=await this.prisma.marketingCampaign.findFirst({
   where:{captureToken:token,captureEnabled:true,status:MarketingCampaignStatus.EM_ANDAMENTO,tenant:{active:true}},
   select:{id:true,tenantId:true,name:true},
  });
  if(!campaign)throw new NotFoundException('Formulário indisponível');
  // Honeypot: silently acknowledge bot submissions without storing data.
  if(body.website)return {success:true};
  const name=this.string(body.name,'Nome',2,120);
  const email=this.string(body.email,'E-mail',5,254).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new BadRequestException('E-mail inválido');
  const phone=this.optional(body.phone,'Telefone',30);
  if(body.consent!==true)throw new BadRequestException('É necessário confirmar o consentimento');
  const params={
   utmSource:this.optional(body.utm_source,'utm_source',120),
   utmMedium:this.optional(body.utm_medium,'utm_medium',120),
   utmCampaign:this.optional(body.utm_campaign,'utm_campaign',120),
   utmContent:this.optional(body.utm_content,'utm_content',120),
   utmTerm:this.optional(body.utm_term,'utm_term',120),
  };
  await this.rateLimit(token,ip||'unknown',email);
  await this.prisma.$transaction(async tx=>{
   const contact=await tx.contact.findFirst({
    where:{tenantId:campaign.tenantId,email:{equals:email,mode:'insensitive'}},
    select:{id:true},
   })??await tx.contact.create({
    data:{tenantId:campaign.tenantId,name,email,phone,source:params.utmSource||'Formulário de campanha'},
    select:{id:true},
   });
   await tx.marketingCampaignContact.upsert({
    where:{campaignId_contactId:{campaignId:campaign.id,contactId:contact.id}},
    create:{tenantId:campaign.tenantId,campaignId:campaign.id,contactId:contact.id},update:{},
   });
   // Unique campaign + contact: repeat submissions do not inflate lead counts.
   await tx.marketingLeadCapture.upsert({
    where:{campaignId_contactId:{campaignId:campaign.id,contactId:contact.id}},
    create:{tenantId:campaign.tenantId,campaignId:campaign.id,contactId:contact.id,consentAt:new Date(),...params},
    update:{},
   });
  });
  return {success:true};
 }
}