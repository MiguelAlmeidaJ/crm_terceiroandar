import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthRequest } from '../auth/auth.guard';
@Injectable()
export class SystemGuard implements CanActivate {
  canActivate(context:ExecutionContext):boolean {
    const req=context.switchToHttp().getRequest<AuthRequest>();
    if(req.user?.role!=='SYSTEM' || req.user.tenantId !== null)throw new ForbiddenException('Acesso restrito ao gestor da plataforma');
    return true;
  }
}
