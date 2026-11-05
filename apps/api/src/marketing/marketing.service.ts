import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MarketingCampaignStatus, MarketingChannel, OpportunityStage, Prisma } from '@prisma/client';
import { PrismaService } from '../infra/prisma/prisma.service';
import { CurrentUser } from '../auth/auth.guard';
import { tenantId } from '../auth/tenant.guard';

const campaignFields = {
  id:true,name:true,description:true,channel:true,status:true,budget:true,spent:true,captureToken:true,captureEnabled:true,
  startDate:true,endDate:true,createdAt:true,updatedAt:true,
  _count:{select:{contacts:true,opportunities:true,leadCaptures:true}},
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
  if('captureEnabled' in body){
   if(typeof body.captureEnabled!=='boolean')throw new BadRequestException('Captura pública inválida');
   data.captureEnabled=body.captureEnabled;
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
  const [total,active,budget,participants,capturedLeads,byChannel]=await Promise.all([
   this.prisma.marketingCampaign.count({where}),
   this.prisma.marketingCampaign.count({where:{...where,status:MarketingCampaignStatus.EM_ANDAMENTO}}),
   this.prisma.marketingCampaign.aggregate({where,_sum:{budget:true,spent:true}}),
   this.prisma.marketingCampaignContact.count({where}),
   this.prisma.marketingLeadCapture.count({where}),
   this.prisma.marketingCampaign.groupBy({by:['channel'],where,_count:{_all:true}}),
  ]);
  return {total,active,participants,capturedLeads,budget:budget._sum.budget?.toString()??'0',spent:budget._sum.spent?.toString()??'0',
   byChannel:byChannel.map(item=>({channel:item.channel,count:item._count._all}))};
 }
 private percentage(a:number,b:number):number|null{return b?Math.round(a/b*1000)/10:null;}
 private unitCost(amount:Prisma.Decimal,count:number):string|null{return count?amount.div(count).toFixed(2):null;}
 async metrics(user:CurrentUser,id:string){
  const company=tenantId(user);
  const campaign=await this.prisma.marketingCampaign.findFirst({
   where:{id,tenantId:company},select:{spent:true,_count:{select:{contacts:true,leadCaptures:true}}}
  });
  if(!campaign)throw new NotFoundException('Campanha não encontrada');
  const [groups,wonAmount]=await Promise.all([
   this.prisma.opportunity.groupBy({by:['stage'],where:{tenantId:company,campaignId:id},_count:{_all:true}}),
   this.prisma.opportunity.aggregate({where:{tenantId:company,campaignId:id,stage:OpportunityStage.GANHO},_sum:{value:true}}),
  ]);
  const count=(stage:OpportunityStage)=>groups.find(g=>g.stage===stage)?._count._all??0;
  const opportunities=groups.reduce((a,b)=>a+b._count._all,0);
  const won=count(OpportunityStage.GANHO),lost=count(OpportunityStage.PERDIDO);
  return {
   campaignId:id,linkedContacts:campaign._count.contacts,capturedLeads:campaign._count.leadCaptures,opportunities,won,lost,open:opportunities-won-lost,
   opportunityWinRate:this.percentage(won,won+lost),
   opportunityConversionRate:this.percentage(won,opportunities),
   contactToOpportunityRate:this.percentage(opportunities,campaign._count.contacts),
   costPerLinkedContact:this.unitCost(campaign.spent,campaign._count.contacts),
   costPerCapturedLead:this.unitCost(campaign.spent,campaign._count.leadCaptures),
   costPerOpportunity:this.unitCost(campaign.spent,opportunities),
   costPerWon:this.unitCost(campaign.spent,won),
   spent:campaign.spent.toString(),wonOpportunityValue:wonAmount._sum.value?.toString()??'0',
   note:'Contatos e oportunidades associados manualmente. Oportunidades ganhas não comprovam receita recebida.',
  };
 }
 async channelReport(user:CurrentUser){
  const company=tenantId(user);
  const [campaigns,groups]=await Promise.all([
   this.prisma.marketingCampaign.findMany({where:{tenantId:company},select:{
     id:true,channel:true,spent:true,_count:{select:{contacts:true,opportunities:true}},
   }}),
   this.prisma.opportunity.groupBy({by:['campaignId','stage'],where:{tenantId:company,campaignId:{not:null}},_count:{_all:true}}),
  ]);
  const byChannel=new Map<MarketingChannel,{channel:MarketingChannel;campaigns:number;linkedContacts:number;opportunities:number;won:number;lost:number;spent:Prisma.Decimal}>();
  for(const campaign of campaigns){
   const row=byChannel.get(campaign.channel)??{
    channel:campaign.channel,campaigns:0,linkedContacts:0,opportunities:0,won:0,lost:0,spent:new Prisma.Decimal(0)
   };
   row.campaigns++;
   row.linkedContacts+=campaign._count.contacts;
   row.opportunities+=campaign._count.opportunities;
   row.spent=row.spent.plus(campaign.spent);
   for(const group of groups.filter(g=>g.campaignId===campaign.id)){
    if(group.stage===OpportunityStage.GANHO)row.won+=group._count._all;
    if(group.stage===OpportunityStage.PERDIDO)row.lost+=group._count._all;
   }
   byChannel.set(campaign.channel,row);
  }
  return Array.from(byChannel.values()).map(row=>({
   channel:row.channel,campaigns:row.campaigns,linkedContacts:row.linkedContacts,
   opportunities:row.opportunities,won:row.won,lost:row.lost,spent:row.spent.toString(),
   costPerLinkedContact:this.unitCost(row.spent,row.linkedContacts),
   costPerOpportunity:this.unitCost(row.spent,row.opportunities),
   winRate:this.percentage(row.won,row.won+row.lost),
  })).sort((a,b)=>b.campaigns-a.campaigns);
 }
 async linkOpportunity(user:CurrentUser,id:string,input:unknown){
  this.manager(user);
  const body=this.input(input,['opportunityId']);
  const opportunityId=this.text(body.opportunityId,'Oportunidade',100);
  const company=tenantId(user);
  return this.prisma.$transaction(async tx=>{
   const campaign=await tx.marketingCampaign.findFirst({where:{id,tenantId:company},select:{id:true}});
   if(!campaign)throw new NotFoundException('Campanha não encontrada');
   const opportunity=await tx.opportunity.findFirst({where:{id:opportunityId,tenantId:company},select:{id:true,title:true,campaignId:true,contactId:true}});
   if(!opportunity)throw new BadRequestException('Oportunidade não encontrada nesta empresa');
   if(opportunity.campaignId&&opportunity.campaignId!==id)throw new ConflictException('Oportunidade já atribuída a outra campanha');
   const changed=await tx.opportunity.updateMany({
    where:{id:opportunityId,tenantId:company,OR:[{campaignId:null},{campaignId:id}]},data:{campaignId:id},
   });
   if(changed.count!==1)throw new ConflictException('Oportunidade atribuída a outra campanha');
   await tx.marketingCampaignContact.upsert({
    where:{campaignId_contactId:{campaignId:id,contactId:opportunity.contactId}},
    create:{tenantId:company,campaignId:id,contactId:opportunity.contactId},update:{},
   });
   return {id:opportunityId,title:opportunity.title,campaignId:id};
  });
 }
 async unlinkOpportunity(user:CurrentUser,id:string,opportunityId:string){
  this.manager(user);
  const company=tenantId(user);
  const changed=await this.prisma.opportunity.updateMany({
   where:{id:opportunityId,tenantId:company,campaignId:id},data:{campaignId:null},
  });
  if(!changed.count)throw new NotFoundException('Atribuição não encontrada');
  return {success:true};
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
  const body=this.input(input,['name','description','channel','status','budget','spent','startDate','endDate','captureEnabled']);
  if(!('name' in body)||!('channel' in body))throw new BadRequestException('Nome e canal são obrigatórios');
  const data=this.data(body);
  this.checkDates(data.startDate as Date|null|undefined,data.endDate as Date|null|undefined);
  return this.prisma.marketingCampaign.create({
   data:{tenantId:tenantId(user),name:data.name as string,channel:data.channel as MarketingChannel,
    ...(data.description!==undefined?{description:data.description as string|null}:{}),
    ...(data.captureEnabled!==undefined?{captureEnabled:data.captureEnabled as boolean}:{}),
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
  const body=this.input(input,['name','description','channel','status','budget','spent','startDate','endDate','captureEnabled'],true);
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
