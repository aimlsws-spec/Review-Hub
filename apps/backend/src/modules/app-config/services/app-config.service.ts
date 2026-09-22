import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { APP_CONFIG_CONSTANTS } from '../constants';
import { AppConfigSnapshot, PublicAppConfig } from '../interfaces';
import { isOlderThan } from '../utils/version.util';

/**
 * The maintenance switch and the oldest supported app version, read cheaply enough to check on every request.
 *
 * If the settings can not be read, the last known ones are used, and if there are none yet the platform is treated
 * as open. Failing open is deliberate: when the database is down nothing works anyway, and this must never be the
 * reason a healthy platform turns everyone away.
 */
@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);
  private cached: { at: number; value: AppConfigSnapshot } | null = null;
  private loading: Promise<AppConfigSnapshot> | null = null;
  /** Bumped by invalidate(), so a read that began before a change can not put its older answer back. */
  private generation = 0;

  constructor(private readonly prisma: PrismaService) {}

  async snapshot(): Promise<AppConfigSnapshot> {
    if (this.cached && Date.now() - this.cached.at < APP_CONFIG_CONSTANTS.CACHE_TTL_MS) return this.cached.value;
    // Requests arriving together share one read instead of each hitting the database.
    return (this.loading ??= this.load().finally(() => {
      this.loading = null;
    }));
  }

  /** Forgets what was remembered, so the next request reads the settings again. Called when an admin saves a change. */
  invalidate(): void {
    this.generation += 1;
    this.cached = null;
  }

  /** What the app may know. [appVersion] is the build asking, if it said. */
  async publicView(appVersion?: string): Promise<PublicAppConfig> {
    const config = await this.snapshot();
    return { ...config, updateRequired: isOlderThan(appVersion, config.minimumAppVersion) };
  }

  private async load(): Promise<AppConfigSnapshot> {
    const generation = this.generation;
    try {
      const row = await this.prisma.platformConfiguration.findFirst({
        where: { deletedAt: null },
        select: { maintenanceMode: true, maintenanceMessage: true, minimumAppVersion: true, updateUrl: true },
      });
      const value: AppConfigSnapshot = {
        maintenanceMode: row?.maintenanceMode ?? false,
        maintenanceMessage: row?.maintenanceMessage?.trim() || APP_CONFIG_CONSTANTS.DEFAULT_MAINTENANCE_MESSAGE,
        minimumAppVersion: row?.minimumAppVersion ?? APP_CONFIG_CONSTANTS.DEFAULT_MINIMUM_VERSION,
        updateUrl: row?.updateUrl ?? null,
      };
      if (generation === this.generation) this.cached = { at: Date.now(), value };
      return value;
    } catch (error) {
      this.logger.warn(`Could not read the app settings, using the last known ones: ${error instanceof Error ? error.message : String(error)}`);
      return (
        this.cached?.value ?? {
          maintenanceMode: false,
          maintenanceMessage: APP_CONFIG_CONSTANTS.DEFAULT_MAINTENANCE_MESSAGE,
          minimumAppVersion: APP_CONFIG_CONSTANTS.DEFAULT_MINIMUM_VERSION,
          updateUrl: null,
        }
      );
    }
  }
}
