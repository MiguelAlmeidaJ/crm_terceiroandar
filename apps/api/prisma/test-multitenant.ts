import assert from 'node:assert/strict';
import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { TenantsService } from '../src/tenants/tenants.service';
import { CrmService } from '../src/crm/crm.service';
import { ContactsImportService } from '../src/crm/contacts-import.service';
import { MarketingService } from '../src/marketing/marketing.service';
import { TasksService } from '../src/tasks/tasks.service';
import { tenantId } from '../src/auth/tenant.guard';
import { CurrentUser } from '../src/auth/auth.guard';

async function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    throw new Error('Teste multiempresa restrito ao banco efêmero da CI; não execute com dados reais.');
  }
  const db = new PrismaClient();
  const prisma = db as PrismaService;
  const tenants = new TenantsService(prisma);
  const crm = new CrmService(prisma);
  const importer = new ContactsImportService(prisma);
  const marketing = new MarketingService(prisma);
  const tasks = new TasksService(prisma);
  try {
    const system = await db.user.findFirst({ where: { role: Role.SYSTEM } });
    assert.ok(system, 'O administrador SYSTEM deve ter sido criado pelo seed');

    const a = await tenants.create({
      name: 'Empresa de Teste A', slug: 'teste-a',
      adminName: 'Admin A', adminEmail: 'a@example.test', adminPassword: 'senha-forte-teste-a',
    }, system.id);
    const b = await tenants.create({
      name: 'Empresa de Teste B', slug: 'teste-b',
      adminName: 'Admin B', adminEmail: 'b@example.test', adminPassword: 'senha-forte-teste-b',
    }, system.id);
    const adminA = await db.user.findUniqueOrThrow({ where: { email: 'a@example.test' } });
    const adminB = await db.user.findUniqueOrThrow({ where: { email: 'b@example.test' } });
    const identity = (u: typeof adminA): CurrentUser => ({ id: u.id, name: u.name, email: u.email, role: u.role, tenantId: u.tenantId, tenantName:null });
    const actorA = identity(adminA);
    const actorB = identity(adminB);

    const contactA = await crm.createContact(actorA, { name: 'Contato isolado A',email:'teste@empresa-a.test',tags:['cliente','parceiro'],source:'Indicação' });
    const contactB = await crm.createContact(actorB, { name: 'Contato isolado B', email:'teste@empresa-a.test' });
    assert.equal((await crm.contact(actorA, contactA.id)).tags.join(','),'cliente,parceiro');
    await assert.rejects(()=>crm.createContact(actorA,{name:'Duplicado',email:'TESTE@EMPRESA-A.TEST'}),/Possível contato duplicado/);
    await assert.rejects(()=>crm.contact(actorA,contactB.id),/Contato não encontrado/);
    await assert.rejects(()=>crm.contactInteractions(actorA,contactB.id),/Contato não encontrado/);
    await assert.rejects(()=>crm.createContactInteraction(actorA,contactB.id,{channel:'NOTA',description:'Indevido'}),/Contato não encontrado/);
    await crm.createContactInteraction(actorA,contactA.id,{channel:'LIGACAO',description:'Primeira ligação'});
    assert.equal((await crm.contactInteractions(actorA,contactA.id)).total,1);
    assert.equal((await crm.contactInteractions(actorB,contactB.id)).total,0);
    const listA = await crm.contacts(actorA);
    assert.equal(listA.total, 1);
    assert.equal(listA.items[0].id, contactA.id);
    await assert.rejects(() => crm.updateContact(actorA, contactB.id, { name: 'Tentativa indevida' }), /Contato não encontrado/);
    await assert.rejects(() => crm.createOpportunity(actorA, { title: 'Inválida', contactId: contactB.id }), /Contato não encontrado/);

    const fileRows = {rows:[
      {name:'Importado A',email:'importacao@a.test',phone:'11911112222',tags:'novo|evento'},
      {name:'Já existe',email:'teste@empresa-a.test'},
      {name:'Sem nome',email:'ruim@a.test'},
      {name:'Importado A duplicado',email:'IMPORTACAO@A.TEST'},
    ]};
    const preview = await importer.preview(actorA,fileRows);
    assert.equal(preview.ready,2);
    assert.equal(preview.duplicates,2);
    const imported = await importer.run(actorA,fileRows);
    assert.equal(imported.imported,2);
    assert.equal((await crm.contacts(actorA)).total,3);
    assert.equal((await crm.contacts(actorB)).total,1);
    const rerun=await importer.run(actorA,fileRows);
    assert.equal(rerun.imported,0);
    assert.equal(rerun.duplicates,4);
    const campaign = await marketing.create(actorA,{name:'Campanha de Teste A',channel:'INSTAGRAM',status:'EM_ANDAMENTO',budget:'1200.00',spent:'125.50'});
    assert.equal((await marketing.list(actorA)).total,1);
    assert.equal((await marketing.list(actorB)).total,0);
    await assert.rejects(()=>marketing.one(actorB,campaign.id),/Campanha não encontrada/);
    await assert.rejects(()=>marketing.linkContact(actorA,campaign.id,{contactId:contactB.id}),/Contato não encontrado/);
    await assert.rejects(()=>marketing.linkContact(actorB,campaign.id,{contactId:contactB.id}),/Campanha não encontrada/);
    await marketing.linkContact(actorA,campaign.id,{contactId:contactA.id});
    await assert.rejects(()=>marketing.linkContact(actorA,campaign.id,{contactId:contactA.id}),/Contato já vinculado/);
    assert.equal((await marketing.one(actorA,campaign.id)).contacts.length,1);
    assert.equal((await marketing.summary(actorA)).participants,1);
    assert.equal((await marketing.summary(actorB)).total,0);
    await assert.rejects(()=>marketing.create({...actorA,role:'COLABORADOR'},{name:'Sem permissão',channel:'EMAIL'}),/Apenas administradores e gestores/);
    const opportunityA = await crm.createOpportunity(actorA, { title: 'Proposta A', contactId: contactA.id });
    const opportunityB = await crm.createOpportunity(actorB, { title: 'Proposta B', contactId: contactB.id });
    await assert.rejects(()=>marketing.linkOpportunity(actorA,campaign.id,{opportunityId:opportunityB.id}),/Oportunidade não encontrada/);
    await assert.rejects(()=>marketing.linkOpportunity(actorB,campaign.id,{opportunityId:opportunityB.id}),/Campanha não encontrada/);
    await marketing.linkOpportunity(actorA,campaign.id,{opportunityId:opportunityA.id});
    const firstMetrics=await marketing.metrics(actorA,campaign.id);
    assert.equal(firstMetrics.linkedContacts,1);
    assert.equal(firstMetrics.opportunities,1);
    assert.equal(firstMetrics.costPerLinkedContact,'125.50');
    assert.equal(firstMetrics.opportunityWinRate,null);
    assert.equal((await marketing.channelReport(actorA))[0].opportunities,1);
    assert.equal((await marketing.channelReport(actorB)).length,0);
    await crm.updateOpportunity(actorA,opportunityA.id,{stage:'GANHO'});
    const conversion=await marketing.metrics(actorA,campaign.id);
    assert.equal(conversion.won,1);
    assert.equal(conversion.opportunityWinRate,100);
    assert.equal(conversion.costPerWon,'125.50');
    await marketing.unlinkOpportunity(actorA,campaign.id,opportunityA.id);
    assert.equal((await marketing.metrics(actorA,campaign.id)).opportunities,0);
    await marketing.linkOpportunity(actorA,campaign.id,{opportunityId:opportunityA.id});
    await assert.rejects(() => crm.activities(actorA, opportunityB.id), /Oportunidade não encontrada/);
    await assert.rejects(() => crm.addActivity(actorA, opportunityB.id, { message: 'Invasão' }), /Oportunidade não encontrada/);
    await assert.rejects(() => crm.updateOpportunity(actorA, opportunityA.id, {ownerId:adminB.id}), /Responsável inválido/);
    const one = await crm.opportunities(actorA);
    assert.equal(one.total, 1);
    assert.equal(one.items[0].id, opportunityA.id);
    await assert.rejects(() => tasks.create(actorA, { title: 'Tarefa indevida', opportunityId: opportunityB.id, dueDate: '2026-12-01' }), /Oportunidade não encontrada/);
    const taskA = await tasks.create(actorA, { title: 'Tarefa A', opportunityId: opportunityA.id, dueDate: '2026-12-01' });
    await assert.rejects(() => tasks.update(actorA, taskA.id, {assigneeId:adminB.id}), /Responsável inexistente/);
    assert.equal((await tasks.list(actorB)).total, 0);
    assert.equal((await tasks.list(actorA)).total, 1);
    assert.throws(() => tenantId({ ...actorA, role: 'SYSTEM', tenantId: null }), /Selecione uma conta empresarial/);

    // Simulates existing customers and users before adopting the legacy company.
    const legacyId = '00000000-0000-4000-8000-000000000001';
    const legacyUser = await db.user.create({ data: {
      name: 'Usuário legado', email: 'legacy@example.test', passwordHash: await hash('senha-legado-teste', 12),
      role: Role.COLABORADOR, tenantId: legacyId,
    } });
    const legacyContact = await db.contact.create({ data: { name: 'Cliente legado', tenantId: legacyId } });
    const legacyInteraction = await db.contactInteraction.create({data:{tenantId:legacyId,contactId:legacyContact.id,authorId:legacyUser.id,channel:'NOTA',description:'Interação legado',occurredAt:new Date()}});
    const legacyOpportunity = await db.opportunity.create({ data: {
      title: 'Negócio legado', tenantId: legacyId, contactId: legacyContact.id, ownerId: legacyUser.id,
    } });
    await db.opportunityActivity.create({ data: { tenantId: legacyId, opportunityId: legacyOpportunity.id, authorId: legacyUser.id, message: 'Histórico preservado' } });
    await db.commercialTask.create({ data: {
      tenantId: legacyId, title: 'Tarefa legada', opportunityId: legacyOpportunity.id,
      assigneeId: legacyUser.id, creatorId: legacyUser.id, dueDate: new Date('2026-12-01T00:00:00Z'),
    } });

    const legacyCampaign=await db.marketingCampaign.create({data:{tenantId:legacyId,name:'Campanha legado',channel:'EMAIL'}});
    await db.marketingCampaignContact.create({data:{tenantId:legacyId,campaignId:legacyCampaign.id,contactId:legacyContact.id}});
    await db.opportunity.update({where:{id:legacyOpportunity.id},data:{campaignId:legacyCampaign.id}});
    const adopted = await tenants.create({
      name: 'Terceiro Andar', slug: 'terceiro-andar-test',
      adminName: 'Admin novo', adminEmail: 'novo@example.test',
      adminPassword: 'senha-nova-administrador', importLegacy: true,
    }, system.id);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: legacyUser.id } })).tenantId, adopted.id);
    assert.equal((await db.contact.findUniqueOrThrow({ where: { id: legacyContact.id } })).tenantId, adopted.id);
    assert.equal((await db.opportunity.findUniqueOrThrow({ where: { id: legacyOpportunity.id } })).tenantId, adopted.id);
    assert.equal((await db.contactInteraction.findUniqueOrThrow({where:{id:legacyInteraction.id}})).tenantId,adopted.id);
    assert.equal((await db.marketingCampaign.findUniqueOrThrow({where:{id:legacyCampaign.id}})).tenantId,adopted.id);
    assert.equal((await db.marketingCampaignContact.findFirstOrThrow({where:{campaignId:legacyCampaign.id}})).tenantId,adopted.id);
    assert.equal((await marketing.metrics({...actorA,tenantId:adopted.id},legacyCampaign.id)).opportunities,1);
    assert.equal((await db.opportunityActivity.findFirstOrThrow({ where: { opportunityId: legacyOpportunity.id } })).tenantId, adopted.id);
    assert.equal((await db.commercialTask.findFirstOrThrow({ where: { opportunityId: legacyOpportunity.id } })).tenantId, adopted.id);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: legacyUser.id } })).sessionVersion, legacyUser.sessionVersion + 1);
    assert.equal((await db.tenant.findUniqueOrThrow({ where: { id: a.id } })).active, true);
    assert.equal((await db.tenant.findUniqueOrThrow({ where: { id: b.id } })).active, true);
    console.log('Testes de isolamento e transferência de dados legados passaram.');
  } finally {
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
