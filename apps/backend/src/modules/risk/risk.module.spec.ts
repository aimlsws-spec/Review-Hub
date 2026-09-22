import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../../database/prisma/prisma.service';

import { RiskModule } from './risk.module';
import { AccountLinkageService, AccountRiskService, DuplicateImageService, IpReputationService, SubmissionRiskService } from './services';

/** Stands in for the app-wide, global Prisma module, so the real dependency graph of RiskModule can be built without a database. */
@Global()
@Module({ providers: [{ provide: PrismaService, useValue: {} }], exports: [PrismaService] })
class FakePrismaModule {}

describe('RiskModule wiring', () => {
  const build = (risk: Record<string, unknown> = {}) =>
    Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ risk })] }),
        FakePrismaModule,
        RiskModule,
      ],
    }).compile();

  it('builds with real dependency injection: every service it exports can be created', async () => {
    const module = await build();

    for (const token of [DuplicateImageService, IpReputationService, AccountLinkageService, AccountRiskService, SubmissionRiskService]) {
      expect(module.get(token)).toBeInstanceOf(token);
    }
  });

  it('starts up cleanly with nothing configured, exactly as an existing install would', async () => {
    const module = await build();

    await expect(module.init()).resolves.toBeDefined();
    expect(module.get(IpReputationService).assess('8.8.8.8').verdict).toBe('UNKNOWN');

    await module.close();
  });

  it('starts up with your own ranges configured and uses them', async () => {
    const module = await build({ ipLists: [], ipExtraCidrs: ['203.0.113.0/24'], ipRefreshHours: 24 });
    await module.init();

    expect(module.get(IpReputationService).assess('203.0.113.9').verdict).toBe('ANONYMIZER');

    await module.close();
  });

  it('exports what the other modules import it for', async () => {
    const exported = Reflect.getMetadata('exports', RiskModule) as unknown[];

    for (const token of [DuplicateImageService, IpReputationService, AccountLinkageService, AccountRiskService, SubmissionRiskService]) {
      expect(exported).toContain(token);
    }
  });
});
