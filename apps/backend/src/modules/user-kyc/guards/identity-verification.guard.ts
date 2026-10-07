import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { REQUIRES_IDENTITY_VERIFICATION_KEY } from '../decorators';
import { IdentityVerificationRequiredException } from '../exceptions';
import { UserKycService } from '../services';

type RequestWithUser = Request & { user?: { id?: string } };

/**
 * Global guard that only acts on routes marked @RequiresIdentityVerification(). Registered after the sign-in guard,
 * because the caller is only known once the token has been read.
 */
@Injectable()
export class IdentityVerificationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userKycService: UserKycService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRES_IDENTITY_VERIFICATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const userId = context.switchToHttp().getRequest<RequestWithUser>().user?.id;
    // No signed-in user means the route is not protected by sign-in at all; leave that to the sign-in guard.
    if (!userId) return true;

    if (!(await this.userKycService.hasIdentityDocument(userId))) {
      throw new IdentityVerificationRequiredException();
    }
    return true;
  }
}
