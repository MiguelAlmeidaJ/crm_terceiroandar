import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../infra/prisma/prisma.service';
import { compare } from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    if (typeof email !== 'string' || typeof password !== 'string') throw new UnauthorizedException('Credenciais inválidas');
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !user.active || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error('JWT_SECRET deve ter no mínimo 32 caracteres');
    const token = await this.jwt.signAsync({ sub: user.id }, { secret, expiresIn: '8h' });
    return { token, user: this.toPublicUser(user) };
  }

  toPublicUser(user: { id: string; name: string; email: string; role: string }) {
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
}
