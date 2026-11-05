import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { OpportunityStage, Prisma, TaskStatus } from '@prisma/client';
import { CurrentUser } from '../auth/auth.guard';
import { tenantId } from '../auth/tenant.guard';
import { PrismaService } from '../infra/prisma/prisma.service';

const stageOrder = Object.values(OpportunityStage);
type Period = '7d' | '30d' | '90d' | 'all';

@Injectable()
export class CommercialDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: CurrentUser, periodInput?: string, ownerIdInput?: string) {
    const period = (periodInput ?? '30d') as Period;
    if (!['7d', '30d', '90d', 'all'].includes(period)) {
      throw new BadRequestException('Período inválido');
    }
    const manager = user.role === 'ADMIN' || user.role === 'GESTOR';
    const ownerId = ownerIdInput?.trim() || undefined;
    if (ownerId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerId)) {
      throw new BadRequestException('Responsável inválido');
    }
    if (!manager && ownerId && ownerId !== user.id) {
      throw new ForbiddenException('Acesso restrito aos próprios indicadores');
    }
    const scopedOwner = manager ? ownerId : user.id;
    const now = new Date();
    const since = period === 'all' ? undefined : new Date(now.getTime() - Number(period.slice(0, -1)) * 86_400_000);
    const where: Prisma.OpportunityWhereInput = {
      tenantId:tenantId(user),
      ...(scopedOwner ? { ownerId: scopedOwner } : {}),
      ...(since ? { createdAt: { gte: since, lte: now } } : {}),
    };
    const openStatuses = [TaskStatus.PENDENTE, TaskStatus.EM_ANDAMENTO];
    const today = new Date(now.toISOString().slice(0, 10) + 'T00:00:00.000Z');
    const taskWhere: Prisma.CommercialTaskWhereInput = scopedOwner ? { tenantId:tenantId(user), assigneeId: scopedOwner } : {tenantId:tenantId(user)};

    const [stages, overall, ownersGrouped, openTasks, overdueTasks, owners] = await Promise.all([
      this.prisma.opportunity.groupBy({
        by: ['stage'], where,
        _count: { _all: true }, _sum: { value: true },
      }),
      this.prisma.opportunity.aggregate({
        where, _count: { _all: true }, _sum: { value: true },
      }),
      this.prisma.opportunity.groupBy({
        by: ['ownerId', 'stage'], where,
        _count: { _all: true }, _sum: { value: true },
      }),
      this.prisma.commercialTask.count({
        where: { ...taskWhere, status: { in: openStatuses } },
      }),
      this.prisma.commercialTask.count({
        where: { ...taskWhere, status: { in: openStatuses }, dueDate: { lt: today } },
      }),
      this.prisma.user.findMany({
        where: manager ? {tenantId:tenantId(user)} : {tenantId:tenantId(user), id: user.id },
        select: { id: true, name: true, active: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const rows = stageOrder.map(stage => {
      const found = stages.find(row => row.stage === stage);
      return {
        stage,
        count: found?._count._all ?? 0,
        value: found?._sum.value?.toString() ?? '0',
      };
    });
    const won = rows.find(row => row.stage === OpportunityStage.GANHO)!.count;
    const lost = rows.find(row => row.stage === OpportunityStage.PERDIDO)!.count;
    // Taxa de ganho calculada sobre oportunidades decididas, não sobre todas as abertas.
    const decided = won + lost;
    const names = new Map(owners.map(owner => [owner.id, owner.name]));
    const ownerRows = new Map<string, { id: string; name: string; total: number; won: number; lost: number; value: Prisma.Decimal }>();
    for (const row of ownersGrouped) {
      const id = row.ownerId ?? 'unassigned';
      const current = ownerRows.get(id) ?? {
        id, name: row.ownerId ? (names.get(row.ownerId) ?? 'Usuário inativo') : 'Sem responsável',
        total: 0, won: 0, lost: 0, value: new Prisma.Decimal(0),
      };
      current.total += row._count._all;
      current.won += row.stage === OpportunityStage.GANHO ? row._count._all : 0;
      current.lost += row.stage === OpportunityStage.PERDIDO ? row._count._all : 0;
      current.value = current.value.plus(row._sum.value ?? new Prisma.Decimal(0));
      ownerRows.set(id, current);
    }
    return {
      period,
      generatedAt: now.toISOString(),
      filters: { ownerId: scopedOwner ?? null, from: since?.toISOString() ?? null, to: now.toISOString() },
      kpis: {
        opportunities: overall._count._all,
        estimatedValue: overall._sum.value?.toString() ?? '0',
        won,
        lost,
        winRate: decided ? Math.round((won / decided) * 1000) / 10 : null,
        openTasks,
        overdueTasks,
      },
      stages: rows,
      owners: owners.map(({ id, name, active }) => ({ id, name, active })),
      performance: Array.from(ownerRows.values())
        .map(({ id, name, total, won: ownerWon, lost: ownerLost, value }) => ({
          id, name, total, won: ownerWon, lost: ownerLost,
          estimatedValue: value.toString(),
          winRate: ownerWon + ownerLost ? Math.round((ownerWon / (ownerWon + ownerLost)) * 1000) / 10 : null,
        }))
        .sort((a, b) => b.total - a.total),
      notes: {
        opportunityPeriod: 'O período filtra pela data de criação das oportunidades; a etapa é a etapa atual.',
        taskPeriod: 'Tarefas abertas e atrasadas são contagens atuais, sem o filtro de data de criação das oportunidades.',
      },
    };
  }
}
