import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ForbiddenException, UnauthorizedException } from '@common/exceptions/domain.exceptions';

import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<{ user: { id: string; roles?: string[] } }>();
    
    if (!request.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const userRoles = request.user.roles;

    if (!userRoles?.length) {
      this.logger.warn(`Permission denial: User ${request.user.id} lacks roles`);
      throw new ForbiddenException('You do not have the required role');
    }

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      this.logger.warn(`Permission denial: User ${request.user.id} lacks required roles: ${requiredRoles.join(', ')}`);
      throw new ForbiddenException('You do not have the required role');
    }

    return true;
  }
}
