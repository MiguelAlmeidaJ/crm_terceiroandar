import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../infra/prisma/prisma.service';
import { CurrentUser } from '../auth/auth.guard';
import { tenantId } from '../auth/tenant.guard';

export type UserInput = { name?: unknown; email?: unknown; password?: unknown; role?: unknown; active?: unknown };
const publicFields = { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true } as const;
const validRoles: Role[] = [Role.ADMIN, Role.GESTOR, Role.COLABORADOR];

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private name(value: unknown) {
    if (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 120) throw new BadRequestException('Nome deve ter de 2 a 120 caracteres');
    return value.trim();
  }
  private email(value: unknown) {
    if (typeof value !== 'string') throw new BadRequestException('E-mail inválido');
    const normalized = value.trim().toLowerCase();
    if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new BadRequestException('E-mail inválido');
    return normalized;
  }
  private role(value: unknown) {
    if (!validRoles.includes(value as Role)) throw new BadRequestException('Perfil inválido');
    return value as Role;
  }
  private password(value: unknown) {
    if (typeof value !== 'string' || value.length < 12 || value.length > 128) throw new BadRequestException('Senha deve ter de 12 a 128 caracteres');
    return value;
  }
  private keys(body: UserInput, allowed: string[]) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Dados inválidos');
    const extra = Object.keys(body).filter(key => !allowed.includes(key));
    if (extra.length) throw new BadRequestException('Campos não permitidos: ' + extra.join(', '));
  }
  private async uniqueError(error: unknown): Promise<never> {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Este e-mail já está cadastrado');
    throw error;
  }

  list(user:CurrentUser) {
    return this.prisma.user.findMany({ where: {tenantId:tenantId(user)},select: publicFields, orderBy: { createdAt: 'desc' }, take: 200 });
  }
  audit(user:CurrentUser) {
    return this.prisma.auditLog.findMany({
      where:{tenantId:tenantId(user)},
      select: { id: true, action: true, targetId: true, details: true, createdAt: true, actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
  }
  async create(body: UserInput, actor:CurrentUser) {
    this.keys(body, ['name', 'email', 'password', 'role']);
    const name = this.name(body.name);
    const email = this.email(body.email);
    const role = this.role(body.role);
    const passwordHash = await hash(this.password(body.password), 12);
    try {
      return await this.prisma.$transaction(async tx => {
        const user = await tx.user.create({ data: { name, email, role, passwordHash,tenantId:tenantId(actor) }, select: publicFields });
        await tx.auditLog.create({ data: { actorId:actor.id, tenantId:tenantId(actor), action: 'USER_CREATED', targetId: user.id, details: { role, email } } });
        return user;
      });
    } catch (error) { return this.uniqueError(error); }
  }
  async update(id: string, body: UserInput, actor:CurrentUser) {
    this.keys(body, ['name', 'email', 'password', 'role', 'active']);
    if (!Object.keys(body).length) throw new BadRequestException('Informe pelo menos um campo');
    const data: Prisma.UserUpdateInput = {};
    if (body.name !== undefined) data.name = this.name(body.name);
    if (body.email !== undefined) data.email = this.email(body.email);
    if (body.role !== undefined) data.role = this.role(body.role);
    if (body.password !== undefined) { data.passwordHash = await hash(this.password(body.password), 12); data.sessionVersion = { increment: 1 }; }
    if (body.active !== undefined) {
      if (typeof body.active !== 'boolean') throw new BadRequestException('Status inválido');
      data.active = body.active;
    }
    if (actor.id === id && (data.active === false || (data.role !== undefined && data.role !== Role.ADMIN))) {
      throw new BadRequestException('Você não pode remover seu próprio acesso administrativo');
    }
    try {
      return await this.prisma.$transaction(async tx => {
        const existing = await tx.user.findFirst({ where: { id,tenantId:tenantId(actor) } });
        if (!existing) throw new NotFoundException('Usuário não encontrado');
        // Garante que o último administrador ativo não seja removido por engano.
        if (existing.active && existing.role === Role.ADMIN && (data.active === false || (data.role && data.role !== Role.ADMIN))) {
          const count = await tx.user.count({ where: { active: true, role: Role.ADMIN,tenantId:tenantId(actor) } });
          if (count <= 1) throw new BadRequestException('É necessário manter um administrador ativo');
        }
        const user = await tx.user.update({ where: { id,tenantId:tenantId(actor) }, data, select: publicFields });
        await tx.auditLog.create({
          data: {
            actorId:actor.id,tenantId:tenantId(actor), action: 'USER_UPDATED', targetId: id,
            details: { fields: Object.keys(body).filter(key => key !== 'password'), passwordChanged: body.password !== undefined },
          },
        });
        return user;
      });
    } catch (error) { return this.uniqueError(error); }
  }
}
