import * as fs from 'fs/promises';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CacheService } from '../../cache/cache.service';
import { PrismaService } from '../../database/prisma/prisma.service';

import { HealthCheckRepository } from './repositories';

export interface ServiceHealth {
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

export interface HealthReport {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;
  timestamp: string;
  version: string;
  services: {
    database: ServiceHealth;
    cache: ServiceHealth;
    storage: ServiceHealth;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
    private readonly healthCheckRepository: HealthCheckRepository,
  ) {}

  /** Persists the check for the historical admin view — never lets a logging failure mask the real health result. */
  private async persist(service: string, health: ServiceHealth): Promise<void> {
    try {
      await this.healthCheckRepository.record(service, health.status === 'up' ? 'HEALTHY' : 'DOWN', health.latencyMs ?? 0);
    } catch {
      // Best-effort logging only.
    }
  }

  async check(): Promise<HealthReport> {
    const [database, cache, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkCache(),
      this.checkStorage(),
    ]);

    const allUp = database.status === 'up' && cache.status === 'up' && storage.status === 'up';
    const anyUp = database.status === 'up' || cache.status === 'up' || storage.status === 'up';

    await Promise.all([
      this.persist('database', database),
      this.persist('cache', cache),
      this.persist('storage', storage),
    ]);

    return {
      status: allUp ? 'ok' : anyUp ? 'degraded' : 'down',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: this.config.get<string>('app.version', '1.0.0'),
      services: { database, cache, storage },
    };
  }

  async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (e) {
      return { status: 'down', error: e instanceof Error ? e.message : 'Unknown' };
    }
  }

  async checkCache(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const healthy = await this.cache.healthCheck();
      return healthy
        ? { status: 'up', latencyMs: Date.now() - start }
        : { status: 'down', error: 'Ping failed' };
    } catch (e) {
      return { status: 'down', error: e instanceof Error ? e.message : 'Unknown' };
    }
  }

  async checkStorage(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const storagePath = this.config.get<string>('storage.localPath', './uploads');
      await fs.access(storagePath);
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (e) {
      return { status: 'down', error: e instanceof Error ? e.message : 'Storage path not accessible' };
    }
  }
}
