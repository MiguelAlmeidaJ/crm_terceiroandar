import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../infra/prisma/prisma.service';
import { compare, hash } from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    if (typeof email !== 'string' || typeof password !== 'string') throw new UnauthorizedException('Credenciais inválidas');
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, include: { tenant: { select: { name:true,active:true } } } });
    if (!user || !user.active || (user.tenantId && !user.tenant?.active) || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error('JWT_SECRET deve ter no mínimo 32 caracteres');
    const token = await this.jwt.signAsync({ sub: user.id, ver: user.sessionVersion }, { secret, expiresIn: '8h' });
    return { token, user: this.toPublicUser(user) };
  }

  async updateProfile(userId: string, input: { name?: unknown }) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'name') ||
        typeof input.name !== 'string' || input.name.trim().length < 2 || input.name.trim().length > 120) {
      throw new BadRequestException('Informe um nome de 2 a 120 caracteres');
    }
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { name: input.name.trim() }, include:{tenant:{select:{name:true}}} });
    return this.toPublicUser(updated);
  }

  async changePassword(userId: string, input: { currentPassword?: unknown; newPassword?: unknown }) {
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
        Object.keys(input).some(key => !['currentPassword','newPassword'].includes(key)) ||
        typeof input.currentPassword !== 'string' || typeof input.newPassword !== 'string') {
      throw new BadRequestException('Informe a senha atual e a nova senha');
    }
    if (input.newPassword.length < 12 || input.newPassword.length > 128 || input.newPassword === input.currentPassword) {
      throw new BadRequestException('Use uma senha diferente de 12 a 128 caracteres');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active || !(await compare(input.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Senha atual incorreta');
    }
    const changed = await this.prisma.user.updateMany({
      where: { id: user.id, sessionVersion: user.sessionVersion },
      data: { passwordHash: await hash(input.newPassword, 12), sessionVersion: { increment: 1 } },
    });
    if (changed.count !== 1) throw new BadRequestException('A senha já foi alterada. Entre novamente.');
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error('JWT_SECRET inválido');
    return this.jwt.signAsync({ sub: user.id, ver: user.sessionVersion + 1 }, { secret, expiresIn: '8h' });
  }

  toPublicUser(user: { id: string; name: string; email: string; role: string; tenantId: string | null; tenant?:{name:string} | null }) {
    return { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId, tenantName: user.tenant?.name ?? null };
  }
}
