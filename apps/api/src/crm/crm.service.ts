import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OpportunityStage, Prisma } from '@prisma/client';
import { PrismaService } from '../infra/prisma/prisma.service';

const stages = Object.values(OpportunityStage);
const contactFields = { id: true, name: true, email: true, phone: true, company: true, notes: true, createdAt: true, updatedAt: true } as const;
const opportunityInclude = {
  contact: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
  _count: { select: { activities: true } },
} as const;

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  private obj(input: unknown, allowed: string[], required = false): Record<string, unknown> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('Corpo inválido');
    const body = input as Record<string, unknown>;
    const extra = Object.keys(body).filter(k => !allowed.includes(k));
    if (extra.length) throw new BadRequestException('Campos não permitidos: ' + extra.join(', '));
    if (required && Object.keys(body).length === 0) throw new BadRequestException('Informe ao menos um campo');
    return body;
  }
  private str(value: unknown, name: string, min = 1, max = 250): string {
    if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new BadRequestException(`${name} deve ter de ${min} a ${max} caracteres`);
    return value.trim();
  }
  private optional(value: unknown, name: string, max = 500): string | null {
    return value === null || value === '' ? null : this.str(value, name, 1, max);
  }
  private page(input?: string): number {
    if (input === undefined) return 1;
    if (!/^[1-9]\d*$/.test(input)) throw new BadRequestException('Página inválida');
    const page = Number(input);
    if (!Number.isSafeInteger(page) || page > 100000) throw new BadRequestException('Página inválida');
    return page;
  }
  private stage(value: unknown): OpportunityStage {
    if (!stages.includes(value as OpportunityStage)) throw new BadRequestException('Etapa inválida');
    return value as OpportunityStage;
  }
  private value(value: unknown): Prisma.Decimal | null {
    if (value === null || value === '') return null;
    if ((typeof value !== 'number' && typeof value !== 'string') || !/^\d{1,12}(\.\d{1,2})?$/.test(String(value))) throw new BadRequestException('Valor inválido (máximo 12 dígitos e 2 decimais)');
    return new Prisma.Decimal(String(value));
  }
  private date(value: unknown): Date | null {
    if (value === null || value === '') return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Data esperada no formato AAAA-MM-DD');
    const date = new Date(value + 'T12:00:00.000Z');
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException('Data inválida');
    return date;
  }

  async contacts(q?: string, pageInput?: string) {
    const page = this.page(pageInput);
    const search = q?.trim();
    if (search && search.length > 100) throw new BadRequestException('Busca muito longa');
    const where: Prisma.ContactWhereInput = search ? { OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ] } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({ where, select: contactFields, take: 20, skip: (page - 1) * 20, orderBy: { createdAt: 'desc' } }),
      this.prisma.contact.count({ where }),
    ]);
    return { items, total, page, pages: Math.ceil(total / 20) };
  }
  createContact(input: unknown) {
    const b = this.obj(input, ['name', 'email', 'phone', 'company', 'notes']);
    const data = {
      name: this.str(b.name, 'Nome', 2, 120),
      email: b.email === undefined ? null : this.optional(b.email, 'E-mail', 254),
      phone: b.phone === undefined ? null : this.optional(b.phone, 'Telefone', 30),
      company: b.company === undefined ? null : this.optional(b.company, 'Empresa', 120),
      notes: b.notes === undefined ? null : this.optional(b.notes, 'Observações', 3000),
    };
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new BadRequestException('E-mail inválido');
    return this.prisma.contact.create({ data, select: contactFields });
  }
  async updateContact(id: string, input: unknown) {
    const b = this.obj(input, ['name', 'email', 'phone', 'company', 'notes'], true);
    const data: Prisma.ContactUpdateInput = {};
    if ('name' in b) data.name = this.str(b.name, 'Nome', 2, 120);
    for (const key of ['email', 'phone', 'company', 'notes'] as const) {
      if (key in b) data[key] = this.optional(b[key], key, key === 'notes' ? 3000 : key === 'email' ? 254 : 120);
    }
    if (typeof data.email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new BadRequestException('E-mail inválido');
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Contato não encontrado');
    return this.prisma.contact.update({ where: { id }, data, select: contactFields });
  }


  owners() {
    return this.prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
      take: 200,
    });
  }

  async kanban(ownerId?: string, q?: string) {
    if (ownerId && !/^[0-9a-f-]{36}$/i.test(ownerId)) throw new BadRequestException('Responsável inválido');
    const search = q?.trim();
    if (search && search.length > 100) throw new BadRequestException('Busca deve ter no máximo 100 caracteres');
    const where: Prisma.OpportunityWhereInput = {
      ...(ownerId ? { ownerId } : {}),
      ...(search ? { OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
      ] } : {}),
    };
    const limitPerColumn = 50;
    const result = await Promise.all(stages.map(async stage => {
      const stageWhere: Prisma.OpportunityWhereInput = { ...where, stage };
      const [items, total] = await this.prisma.$transaction([
        this.prisma.opportunity.findMany({
          where: stageWhere,
          include: opportunityInclude,
          orderBy: { updatedAt: 'desc' },
          take: limitPerColumn,
        }),
        this.prisma.opportunity.count({ where: stageWhere }),
      ]);
      return { stage, items, total, hasMore: total > limitPerColumn };
    }));
    const value = await this.prisma.opportunity.aggregate({ where, _sum: { value: true }, _count: { _all: true } });
    return {
      columns: result,
      totals: { opportunities: value._count._all, value: value._sum.value?.toString() ?? '0' },
      limitPerColumn,
    };
  }

  async opportunities(stageInput?: string, pageInput?: string) {
    const page = this.page(pageInput);
    const where: Prisma.OpportunityWhereInput = stageInput ? { stage: this.stage(stageInput) } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.opportunity.findMany({ where, include: opportunityInclude, orderBy: { createdAt: 'desc' }, take: 30, skip: (page - 1) * 30 }),
      this.prisma.opportunity.count({ where }),
    ]);
    return { items, total, page, pages: Math.ceil(total / 30) };
  }
  async createOpportunity(input: unknown, actorId: string) {
    const b = this.obj(input, ['title', 'description', 'value', 'contactId', 'ownerId', 'expectedAt']);
    const contactId = this.str(b.contactId, 'Contato', 1, 100);
    if (!await this.prisma.contact.findUnique({ where: { id: contactId } })) throw new BadRequestException('Contato não encontrado');
    let ownerId = actorId;
    if (b.ownerId !== undefined && b.ownerId !== null && b.ownerId !== '') ownerId = this.str(b.ownerId, 'Responsável', 1, 100);
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner || !owner.active) throw new BadRequestException('Responsável inválido ou inativo');
    return this.prisma.opportunity.create({ data: {
      title: this.str(b.title, 'Título', 2, 150), contactId, ownerId,
      description: b.description === undefined ? null : this.optional(b.description, 'Descrição', 3000),
      value: b.value === undefined ? null : this.value(b.value),
      expectedAt: b.expectedAt === undefined ? null : this.date(b.expectedAt),
    }, include: opportunityInclude });
  }
  async updateOpportunity(id: string, input: unknown, actorId: string) {
    const b = this.obj(input, ['title', 'description', 'value', 'stage', 'ownerId', 'expectedAt'], true);
    const previous = await this.prisma.opportunity.findUnique({ where: { id } });
    if (!previous) throw new NotFoundException('Oportunidade não encontrada');
    const data: Prisma.OpportunityUncheckedUpdateInput = {};
    if ('title' in b) data.title = this.str(b.title, 'Título', 2, 150);
    if ('description' in b) data.description = this.optional(b.description, 'Descrição', 3000);
    if ('value' in b) data.value = this.value(b.value);
    if ('stage' in b) data.stage = this.stage(b.stage);
    if ('expectedAt' in b) data.expectedAt = this.date(b.expectedAt);
    if ('ownerId' in b) {
      const ownerId = this.str(b.ownerId, 'Responsável', 1, 100);
      const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
      if (!owner || !owner.active) throw new BadRequestException('Responsável inválido ou inativo');
      data.ownerId = ownerId;
    }
    return this.prisma.$transaction(async tx => {
      const updated = await tx.opportunity.update({ where: { id }, data, include: opportunityInclude });
      if (data.stage && data.stage !== previous.stage) {
        await tx.opportunityActivity.create({ data: { opportunityId: id, authorId: actorId, message: `Etapa alterada: ${previous.stage} → ${data.stage}` } });
      }
      return updated;
    });
  }
  async activities(id: string) {
    if (!await this.prisma.opportunity.findUnique({ where: { id } })) throw new NotFoundException('Oportunidade não encontrada');
    return this.prisma.opportunityActivity.findMany({ where: { opportunityId: id }, include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
  async addActivity(id: string, input: unknown, actorId: string) {
    const b = this.obj(input, ['message']);
    const message = this.str(b.message, 'Atividade', 2, 2000);
    if (!await this.prisma.opportunity.findUnique({ where: { id } })) throw new NotFoundException('Oportunidade não encontrada');
    return this.prisma.opportunityActivity.create({ data: { opportunityId: id, authorId: actorId, message } });
  }
  async summary() {
    const [contacts, opportunities, byStage] = await Promise.all([
      this.prisma.contact.count(),
      this.prisma.opportunity.count(),
      this.prisma.opportunity.groupBy({ by: ['stage'], _count: { _all: true } }),
    ]);
    return { contacts, opportunities, byStage: Object.fromEntries(stages.map(s => [s, byStage.find(x => x.stage === s)?._count._all || 0])) };
  }
}
