import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import { PrismaService } from '../infra/prisma/prisma.service';
import { CurrentUser } from '../auth/auth.guard';
import { tenantId } from '../auth/tenant.guard';

const taskSelect = {
  id: true, title: true, description: true, status: true, priority: true,
  dueDate: true, completedAt: true, createdAt: true, updatedAt: true,
  assignee: { select: { id: true, name: true } },
  creator: { select: { id: true, name: true } },
  opportunity: { select: { id: true, title: true, contact: { select: { name: true } } } },
} as const;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private manager(user: CurrentUser): boolean {
    return user.role === 'ADMIN' || user.role === 'GESTOR';
  }

  private body(value: unknown, allowed: string[]): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Dados inválidos');
    const input = value as Record<string, unknown>;
    if (Object.keys(input).length === 0) throw new BadRequestException('Informe ao menos um campo');
    if (Object.keys(input).some(key => !allowed.includes(key))) throw new BadRequestException('Campo não permitido');
    return input;
  }

  private requiredText(value: unknown, field: string, max: number): string {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new BadRequestException(`${field} inválido`);
    return value.trim();
  }

  private dueDate(value: unknown): Date {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Prazo deve estar no formato AAAA-MM-DD');
    const date = new Date(value + 'T00:00:00.000Z');
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException('Prazo inválido');
    return date;
  }

  private status(value: unknown): TaskStatus {
    if (!Object.values(TaskStatus).includes(value as TaskStatus)) throw new BadRequestException('Status inválido');
    return value as TaskStatus;
  }

  private priority(value: unknown): TaskPriority {
    if (!Object.values(TaskPriority).includes(value as TaskPriority)) throw new BadRequestException('Prioridade inválida');
    return value as TaskPriority;
  }

  private page(value?: string): number {
    if (!value) return 1;
    if (!/^[1-9]\d*$/.test(value) || Number(value) > 100000) throw new BadRequestException('Página inválida');
    return Number(value);
  }

  async list(user: CurrentUser, status?: string, assigneeId?: string, page?: string) {
    const pageNumber = this.page(page);
    const filter: Prisma.CommercialTaskWhereInput = {tenantId:tenantId(user)};
    if (status) filter.status = this.status(status);
    if (!this.manager(user)) {
      if (assigneeId && assigneeId !== user.id) throw new ForbiddenException('Você só pode visualizar suas tarefas');
      filter.assigneeId = user.id;
    } else if (assigneeId) {
      filter.assigneeId = this.requiredText(assigneeId, 'Responsável', 100);
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.commercialTask.findMany({ where: filter, select: taskSelect, orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }], take: 20, skip: (pageNumber - 1) * 20 }),
      this.prisma.commercialTask.count({ where: filter }),
    ]);
    return { items, total, page: pageNumber, pages: Math.ceil(total / 20) };
  }

  async summary(user: CurrentUser) {
    const where: Prisma.CommercialTaskWhereInput = this.manager(user) ? {tenantId:tenantId(user)} : {tenantId:tenantId(user), assigneeId: user.id };
    const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
    const open: TaskStatus[] = [TaskStatus.PENDENTE, TaskStatus.EM_ANDAMENTO];
    const [pending, overdue, done] = await Promise.all([
      this.prisma.commercialTask.count({ where: { ...where, status: { in: open } } }),
      this.prisma.commercialTask.count({ where: { ...where, status: { in: open }, dueDate: { lt: today } } }),
      this.prisma.commercialTask.count({ where: { ...where, status: TaskStatus.CONCLUIDA } }),
    ]);
    return { pending, overdue, done };
  }

  async create(user: CurrentUser, value: unknown) {
    const b = this.body(value, ['title', 'description', 'priority', 'dueDate', 'opportunityId', 'assigneeId']);
    const opportunityId = this.requiredText(b.opportunityId, 'Oportunidade', 100);
    const opportunity = await this.prisma.opportunity.findFirst({ where: { id: opportunityId,tenantId:tenantId(user) } });
    if (!opportunity) throw new NotFoundException('Oportunidade não encontrada');
    const assigneeId = b.assigneeId === undefined ? user.id : this.requiredText(b.assigneeId, 'Responsável', 100);
    if (!this.manager(user) && assigneeId !== user.id) throw new ForbiddenException('Você só pode atribuir tarefas para si');
    const assignee = await this.prisma.user.findFirst({ where: { id: assigneeId,tenantId:tenantId(user) }, select: { active: true } });
    if (!assignee?.active) throw new BadRequestException('Responsável inexistente ou inativo');

    return this.prisma.commercialTask.create({
      data: {
        title: this.requiredText(b.title, 'Título', 150),
        description: b.description === undefined || b.description === null || b.description === '' ? null : this.requiredText(b.description, 'Descrição', 2000),
        priority: b.priority === undefined ? TaskPriority.MEDIA : this.priority(b.priority),
        dueDate: this.dueDate(b.dueDate),tenantId:tenantId(user),
        opportunityId, assigneeId, creatorId: user.id,
      },
      select: taskSelect,
    });
  }

  async update(user: CurrentUser, id: string, value: unknown) {
    const b = this.body(value, ['title', 'description', 'priority', 'dueDate', 'status', 'assigneeId']);
    const task = await this.prisma.commercialTask.findFirst({ where: { id,tenantId:tenantId(user) } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    if (!this.manager(user) && task.assigneeId !== user.id) throw new ForbiddenException('Tarefa atribuída a outro usuário');

    const data: Prisma.CommercialTaskUncheckedUpdateInput = {};
    if ('title' in b) data.title = this.requiredText(b.title, 'Título', 150);
    if ('description' in b) data.description = b.description === null || b.description === '' ? null : this.requiredText(b.description, 'Descrição', 2000);
    if ('priority' in b) data.priority = this.priority(b.priority);
    if ('dueDate' in b) data.dueDate = this.dueDate(b.dueDate);
    if ('status' in b) {
      data.status = this.status(b.status);
      if (data.status === TaskStatus.CONCLUIDA && task.status !== TaskStatus.CONCLUIDA) data.completedAt = new Date();
      if (data.status !== TaskStatus.CONCLUIDA) data.completedAt = null;
    }
    if ('assigneeId' in b) {
      if (!this.manager(user)) throw new ForbiddenException('Somente gestores podem reatribuir tarefas');
      const assigneeId = this.requiredText(b.assigneeId, 'Responsável', 100);
      const active = await this.prisma.user.findUnique({ where: { id: assigneeId }, select: { active: true } });
      if (!active?.active) throw new BadRequestException('Responsável inexistente ou inativo');
      data.assigneeId = assigneeId;
    }
    return this.prisma.commercialTask.update({ where: { id,tenantId:tenantId(user) }, data, select: taskSelect });
  }
}
