import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

import { SystemRole } from '@common/enums';

import { APP_VERSION_HEADER, MAINTENANCE_EXEMPT_PATH, VERSION_EXEMPT_PATH } from '../constants';
import { AppUpdateRequiredException, MaintenanceException } from '../exceptions';
import { AppConfigService } from '../services';
import { isOlderThan } from '../utils/version.util';

type RequestWithUser = Request & { user?: { roles?: string[] } };

/**
 * Two doors closed by the platform settings, for every request:
 * - maintenance: everyone but an administrator is turned away with 503;
 * - old apps: a build older than the minimum version is turned away with 426.
 *
 * It must run after the sign-in guard, because who is an administrator is only known once the token is read.
 * A caller that does not send a version (the web portals, tools, and app builds from before the header existed) is
 * never treated as out of date.
 */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly appConfig: AppConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const path = request.path;
    const config = await this.appConfig.snapshot();

    const isAdmin = request.user?.roles?.includes(SystemRole.Admin) ?? false;
    if (config.maintenanceMode && !isAdmin && !MAINTENANCE_EXEMPT_PATH.test(path)) {
      throw new MaintenanceException(config.maintenanceMessage);
    }

    const version = request.headers[APP_VERSION_HEADER];
    if (typeof version === 'string' && !VERSION_EXEMPT_PATH.test(path) && isOlderThan(version, config.minimumAppVersion)) {
      throw new AppUpdateRequiredException(config.minimumAppVersion, config.updateUrl);
    }

    return true;
  }
}
