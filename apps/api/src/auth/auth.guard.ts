import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../infra/prisma/prisma.service';

export type CurrentUser = { id: string; name: string; email: string; role: string };
export type AuthRequest = Request & { user?: CurrentUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies?.ta_session as string | undefined;
    const secret = process.env.JWT_SECRET;
    if (!token || !secret) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; ver?: number }>(token, { secret, algorithms: ['HS256'] });
      if (!payload.sub) throw new UnauthorizedException();
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true, email: true, role: true, active: true, sessionVersion: true },
      });
      if (!user || !user.active || payload.ver !== user.sessionVersion) throw new UnauthorizedException();
      request.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      return true;
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }
  }
}
