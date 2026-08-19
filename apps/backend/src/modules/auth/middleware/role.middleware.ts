import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RoleMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const user = req.user as { roles?: string[] } | undefined;
    if (user?.roles) {
      (req as unknown as Record<string, unknown>)['userRoles'] = user.roles;
    }
    next();
  }
}
