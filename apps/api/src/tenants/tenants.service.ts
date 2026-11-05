import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../infra/prisma/prisma.service';

const LEGACY = '00000000-0000-4000-8000-000000000001';
const publicCompany = { id:true,name:true,slug:true,active:true,isLegacy:true,createdAt:true, _count:{select:{users:true,contacts:true,opportunities:true,tasks:true}} } as const;
@Injectable()
export class TenantsService {
 constructor(private readonly prisma:PrismaService){}
 list(){return this.prisma.tenant.findMany({select:publicCompany,orderBy:{createdAt:'asc'},take:200});}
 private object(input:unknown,allowed:string[]){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new BadRequestException('Dados inválidos');
  const body=input as Record<string,unknown>;
  if(Object.keys(body).some(k=>!allowed.includes(k)))throw new BadRequestException('Campos não permitidos');
  return body;
 }
 private string(v:unknown,label:string,min:number,max:number){
  if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)throw new BadRequestException(label+' inválido');
  return v.trim();
 }
 private slug(v:unknown){
  const slug=this.string(v,'Identificador',3,50).toLowerCase();
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug==='legado')throw new BadRequestException('Identificador inválido ou reservado');
  return slug;
 }
 async create(input:unknown,actorId:string){
  const b=this.object(input,['name','slug','adminName','adminEmail','adminPassword','importLegacy']);
  const name=this.string(b.name,'Empresa',2,120);
  const slug=this.slug(b.slug);
  const adminName=this.string(b.adminName,'Nome do administrador',2,120);
  const adminEmail=this.string(b.adminEmail,'E-mail',4,254).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail))throw new BadRequestException('E-mail inválido');
  const adminPassword=this.string(b.adminPassword,'Senha',12,128);
  if(b.importLegacy!==undefined&&typeof b.importLegacy!=='boolean')throw new BadRequestException('Importação inválida');
  try{
   return await this.prisma.$transaction(async tx=>{
    if(await tx.user.findUnique({where:{email:adminEmail}}))throw new ConflictException('Já existe usuário com este e-mail');
    const company=await tx.tenant.create({data:{name,slug},select:{id:true}});
    await tx.user.create({data:{name:adminName,email:adminEmail,passwordHash:await hash(adminPassword,12),role:Role.ADMIN,tenantId:company.id}});
    if(b.importLegacy===true){
      const legacy=await tx.tenant.findUnique({where:{id:LEGACY}});
      if(!legacy?.isLegacy)throw new BadRequestException('Empresa legado não encontrada');
      // All related CRM records move together to avoid cross-company references.
      // Requiring legacy company data to stay in a single tenant avoids accidental partial moves.
      await tx.user.updateMany({where:{tenantId:LEGACY},data:{tenantId:company.id,sessionVersion:{increment:1}}});
      await tx.contact.updateMany({where:{tenantId:LEGACY},data:{tenantId:company.id}});
      await tx.opportunity.updateMany({where:{tenantId:LEGACY},data:{tenantId:company.id}});
      await tx.opportunityActivity.updateMany({where:{tenantId:LEGACY},data:{tenantId:company.id}});
      await tx.contactInteraction.updateMany({where:{tenantId:LEGACY},data:{tenantId:company.id}});
      await tx.commercialTask.updateMany({where:{tenantId:LEGACY},data:{tenantId:company.id}});
      await tx.marketingCampaign.updateMany({where:{tenantId:LEGACY},data:{tenantId:company.id}});
      await tx.marketingCampaignContact.updateMany({where:{tenantId:LEGACY},data:{tenantId:company.id}});
      await tx.auditLog.updateMany({where:{tenantId:LEGACY},data:{tenantId:company.id}});
    }
    return tx.tenant.findUniqueOrThrow({where:{id:company.id},select:publicCompany});
   },{timeout:30000});
  }catch(error){
   if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')throw new ConflictException('Identificador ou e-mail já utilizado');
   throw error;
  }
 }
 async update(id:string,input:unknown){
  const b=this.object(input,['name','active']);
  if(!Object.keys(b).length)throw new BadRequestException('Informe uma alteração');
  const tenant=await this.prisma.tenant.findUnique({where:{id}});
  if(!tenant)throw new NotFoundException('Empresa não encontrada');
  const data:Prisma.TenantUpdateInput={};
  if('name' in b)data.name=this.string(b.name,'Empresa',2,120);
  if('active' in b){
   if(typeof b.active!=='boolean')throw new BadRequestException('Status inválido');
   data.active=b.active;
  }
  return this.prisma.tenant.update({where:{id},data,select:publicCompany});
 }
}
