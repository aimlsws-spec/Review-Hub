import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ForbiddenException, UnauthorizedException } from '@common/exceptions/domain.exceptions';

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthService } from '../services/auth.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length) return true;

    const request = context.switchToHttp().getRequest<{ user: { id: string } }>();
    
    if (!request.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const userId = request.user.id;


    const userPermissions = await this.authService.getUserPermissions(userId);

    const hasPermission = requiredPermissions.some((permission) => userPermissions.includes(permission));
    if (!hasPermission) {
      this.logger.warn(`Permission denial: User ${userId} lacks required permissions: ${requiredPermissions.join(', ')}`);
      throw new ForbiddenException('You do not have the required permissions');
    }

    return true;
  }
}
