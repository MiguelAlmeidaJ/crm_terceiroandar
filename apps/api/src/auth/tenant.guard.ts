import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthRequest, CurrentUser } from './auth.guard';
export function tenantId(user: CurrentUser): string {
  if (!user.tenantId || user.role === 'SYSTEM') {
    throw new ForbiddenException('Selecione uma conta empresarial para utilizar o CRM');
  }
  return user.tenantId;
}
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    tenantId(context.switchToHttp().getRequest<AuthRequest>().user!);
    return true;
  }
}
