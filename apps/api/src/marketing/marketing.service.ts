import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MarketingCampaignStatus, MarketingChannel, OpportunityStage, Prisma } from '@prisma/client';
import { PrismaService } from '../infra/prisma/prisma.service';
import { CurrentUser } from '../auth/auth.guard';
import { tenantId } from '../auth/tenant.guard';

const campaignFields = {
  id:true,name:true,description:true,channel:true,status:true,budget:true,spent:true,
  startDate:true,endDate:true,createdAt:true,updatedAt:true,
  _count:{select:{contacts:true,opportunities:true}},
} as const;
const statuses=Object.values(MarketingCampaignStatus);
const channels=Object.values(MarketingChannel);

@Injectable()
export class MarketingService {
 constructor(private readonly prisma:PrismaService){}
 private manager(user:CurrentUser) {
  if(user.role!=='ADMIN'&&user.role!=='GESTOR')throw new ForbiddenException('Apenas administradores e gestores podem modificar campanhas');
 }
 private input(body:unknown,allowed:string[],required=false):Record<string,unknown>{
  if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Dados inválidos');
  const value=body as Record<string,unknown>;
  if(Object.keys(value).some(k=>!allowed.includes(k)))throw new BadRequestException('Campos não permitidos');
  if(required&&!Object.keys(value).length)throw new BadRequestException('Informe ao menos um campo');
  return value;
 }
 private text(value:unknown,field:string,max:number,min=1) {
  if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw new BadRequestException(field+' inválido');
  return value.trim();
 }
 private nullable(value:unknown,field:string,max:number) {
  if(value===null||value==='')return null;
  return this.text(value,field,max);
 }
 private decimal(value:unknown,field:string) {
  if(value===null||value==='')return null;
  if((typeof value!=='string'&&typeof value!=='number')||!/^\d{1,12}(\.\d{1,2})?$/.test(String(value)))throw new BadRequestException(field+' deve ser um valor não negativo com até 2 casas decimais');
  return new Prisma.Decimal(String(value));
 }
 private date(value:unknown):Date|null {
  if(value===null||value==='')return null;
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new BadRequestException('Data inválida');
  const result=new Date(value+'T00:00:00.000Z');
  if(Number.isNaN(result.getTime())||result.toISOString().slice(0,10)!==value)throw new BadRequestException('Data inválida');
  return result;
 }
 private validStatus(input:unknown) {
  if(!statuses.includes(input as MarketingCampaignStatus))throw new BadRequestException('Status inválido');
  return input as MarketingCampaignStatus;
 }
 private validChannel(input:unknown) {
  if(!channels.includes(input as MarketingChannel))throw new BadRequestException('Canal inválido');
  return input as MarketingChannel;
 }
 private page(value?:string) {
  if(value===undefined)return 1;
  if(!/^[1-9]\d*$/.test(value)||Number(value)>100000)throw new BadRequestException('Página inválida');
  return Number(value);
 }
 private data(body:Record<string,unknown>):Prisma.MarketingCampaignUncheckedUpdateInput {
  const data:Prisma.MarketingCampaignUncheckedUpdateInput={};
  if('name' in body)data.name=this.text(body.name,'Campanha',150,2);
  if('description' in body)data.description=this.nullable(body.description,'Descrição',3000);
  if('channel' in body)data.channel=this.validChannel(body.channel);
  if('status' in body)data.status=this.validStatus(body.status);
  if('budget' in body)data.budget=this.decimal(body.budget,'Orçamento');
  if('spent' in body){
    const spent=this.decimal(body.spent,'Valor gasto');
    if(spent===null)throw new BadRequestException('Valor gasto obrigatório');
    data.spent=spent;
  }
  if('startDate' in body)data.startDate=this.date(body.startDate);
  if('endDate' in body)data.endDate=this.date(body.endDate);
  return data;
 }
 private checkDates(start:Date|null|undefined,end:Date|null|undefined) {
  if(start&&end&&start.getTime()>end.getTime())throw new BadRequestException('A data final deve ser igual ou posterior à inicial');
 }
 async list(user:CurrentUser,pageInput?:string,statusInput?:string,qInput?:string) {
  const page=this.page(pageInput),id=tenantId(user);
  const q=qInput?.trim();
  if(q&&q.length>100)throw new BadRequestException('Busca muito longa');
  const where:Prisma.MarketingCampaignWhereInput={
   tenantId:id,
   ...(statusInput?{status:this.validStatus(statusInput)}:{}),
   ...(q?{name:{contains:q,mode:'insensitive'}}:{}),
  };
  const [items,total]=await this.prisma.$transaction([
    this.prisma.marketingCampaign.findMany({where,select:campaignFields,orderBy:{createdAt:'desc'},skip:(page-1)*20,take:20}),
    this.prisma.marketingCampaign.count({where}),
  ]);
  return {items,total,page,pages:Math.ceil(total/20)};
 }
 async summary(user:CurrentUser) {
  const where={tenantId:tenantId(user)};
  const [total,active,budget,participants,byChannel]=await Promise.all([
   this.prisma.marketingCampaign.count({where}),
   this.prisma.marketingCampaign.count({where:{...where,status:MarketingCampaignStatus.EM_ANDAMENTO}}),
   this.prisma.marketingCampaign.aggregate({where,_sum:{budget:true,spent:true}}),
   this.prisma.marketingCampaignContact.count({where}),
   this.prisma.marketingCampaign.groupBy({by:['channel'],where,_count:{_all:true}}),
  ]);
  return {total,active,participants,budget:budget._sum.budget?.toString()??'0',spent:budget._sum.spent?.toString()??'0',
   byChannel:byChannel.map(item=>({channel:item.channel,count:item._count._all}))};
 }
 async one(user:CurrentUser,id:string) {
  const campaign=await this.prisma.marketingCampaign.findFirst({
   where:{id,tenantId:tenantId(user)},
   select:{...campaignFields,opportunities:{select:{id:true,title:true,stage:true,value:true,contact:{select:{name:true}}},orderBy:{createdAt:'desc'},take:100},contacts:{
     select:{id:true,createdAt:true,contact:{select:{id:true,name:true,email:true,phone:true}}},
     orderBy:{createdAt:'desc'},take:100,
   }},
  });
  if(!campaign)throw new NotFoundException('Campanha não encontrada');
  return {...campaign,metrics:await this.metrics(user,id)};
 }
 async create(user:CurrentUser,input:unknown){
  this.manager(user);
  const body=this.input(input,['name','description','channel','status','budget','spent','startDate','endDate']);
  if(!('name' in body)||!('channel' in body))throw new BadRequestException('Nome e canal são obrigatórios');
  const data=this.data(body);
  this.checkDates(data.startDate as Date|null|undefined,data.endDate as Date|null|undefined);
  return this.prisma.marketingCampaign.create({
   data:{tenantId:tenantId(user),name:data.name as string,channel:data.channel as MarketingChannel,
    ...(data.description!==undefined?{description:data.description as string|null}:{}),
    ...(data.status!==undefined?{status:data.status as MarketingCampaignStatus}:{}),
    ...(data.budget!==undefined?{budget:data.budget as Prisma.Decimal|null}:{}),
    ...(data.spent!==undefined?{spent:data.spent as Prisma.Decimal}:{}),
    ...(data.startDate!==undefined?{startDate:data.startDate as Date|null}:{}),
    ...(data.endDate!==undefined?{endDate:data.endDate as Date|null}:{}),
   },select:campaignFields,
  });
 }
 async update(user:CurrentUser,id:string,input:unknown){
  this.manager(user);
  const body=this.input(input,['name','description','channel','status','budget','spent','startDate','endDate'],true);
  const existing=await this.prisma.marketingCampaign.findFirst({where:{id,tenantId:tenantId(user)}});
  if(!existing)throw new NotFoundException('Campanha não encontrada');
  const data=this.data(body);
  this.checkDates(data.startDate===undefined?existing.startDate:data.startDate as Date|null,
                  data.endDate===undefined?existing.endDate:data.endDate as Date|null);
  return this.prisma.marketingCampaign.update({where:{id,tenantId:tenantId(user)},data,select:campaignFields});
 }
 async linkContact(user:CurrentUser,id:string,input:unknown){
  this.manager(user);
  const body=this.input(input,['contactId']);
  const contactId=this.text(body.contactId,'Contato',100);
  const company=tenantId(user);
  const [campaign,contact]=await Promise.all([
   this.prisma.marketingCampaign.findFirst({where:{id,tenantId:company},select:{id:true}}),
   this.prisma.contact.findFirst({where:{id:contactId,tenantId:company},select:{id:true}}),
  ]);
  if(!campaign)throw new NotFoundException('Campanha não encontrada');
  if(!contact)throw new BadRequestException('Contato não encontrado nesta empresa');
  try{
   return await this.prisma.marketingCampaignContact.create({
     data:{tenantId:company,campaignId:id,contactId},
     select:{id:true,createdAt:true,contact:{select:{id:true,name:true}}},
   });
  }catch(error){
   if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')
    throw new ConflictException('Contato já vinculado à campanha');
   throw error;
  }
 }
}
