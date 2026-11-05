import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthRequest } from '../auth/auth.guard';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    if (req.user?.role !== 'ADMIN') throw new ForbiddenException('Acesso restrito ao administrador');
    if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) {
      const origin = req.headers.origin;
      const allowed = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(s => s.trim());
      if (origin && !allowed.includes(origin)) throw new ForbiddenException('Origem não permitida');
    }
    return true;
  }
}
