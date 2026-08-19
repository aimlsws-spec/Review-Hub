import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class PermissionMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const user = req.user as { permissions?: string[] } | undefined;
    if (user?.permissions) {
      (req as unknown as Record<string, unknown>)['userPermissions'] = user.permissions;
    }
    next();
  }
}
