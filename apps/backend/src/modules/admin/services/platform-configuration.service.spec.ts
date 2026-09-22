import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { PlatformConfigurationService } from './platform-configuration.service';

describe('PlatformConfigurationService', () => {
  const repository = { getOrCreate: jest.fn(), update: jest.fn() };
  const audit = { record: jest.fn() };
  const appConfig = { invalidate: jest.fn() };
  let service: PlatformConfigurationService;

  const current = {
    id: 'config-1',
    minimumWithdrawal: '1000.00',
    maximumWithdrawal: '50000.00',
    dailyWithdrawalLimit: '50000.00',
    monthlyWithdrawalLimit: null,
    bankCoolingHours: 24,
    payoutMode: 'GATEWAY',
    tdsRate: '0.0000',
    tdsSection: null,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    repository.getOrCreate.mockResolvedValue(current);
    repository.update.mockImplementation(async (_id: string, dto: object) => ({ ...current, ...dto }));
    service = new PlatformConfigurationService(repository as never, audit as never, appConfig as never);
  });

  it('makes the app-settings cache forget what it knew, so maintenance and the minimum version apply at once', async () => {
    await service.update({ maintenanceMode: true }, 'admin-1');

    expect(appConfig.invalidate).toHaveBeenCalledTimes(1);
  });

  it('saves a change and records who made it, with the old values beside the new', async () => {
    await service.update({ minimumWithdrawal: 500, payoutMode: 'MANUAL' }, 'admin-1');

    expect(repository.update).toHaveBeenCalledWith('config-1', { minimumWithdrawal: 500, payoutMode: 'MANUAL' });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'CONFIG_CHANGE',
        before: { minimumWithdrawal: '1000.00', payoutMode: 'GATEWAY' },
        after: { minimumWithdrawal: 500, payoutMode: 'MANUAL' },
      }),
    );
  });

  describe('refuses limits that contradict each other', () => {
    it.each([
      ['a minimum above the maximum', { minimumWithdrawal: 60000 }, /minimum withdrawal can not be more than the maximum/i],
      ['a maximum below the minimum', { maximumWithdrawal: 500 }, /minimum withdrawal can not be more than the maximum/i],
      ['a minimum above the daily limit', { minimumWithdrawal: 1000, maximumWithdrawal: 50000, dailyWithdrawalLimit: 900 }, /nobody could withdraw/i],
      ['a monthly limit below the daily limit', { monthlyWithdrawalLimit: 40000 }, /monthly limit can not be less than the daily limit/i],
    ])('%s', async (_label, dto, message) => {
      await expect(service.update(dto as never, 'admin-1')).rejects.toThrow(message);
      expect(repository.update).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('checks against what is saved, not only what is sent', async () => {
      // Only the daily limit is sent, but it clashes with the saved minimum.
      await expect(service.update({ dailyWithdrawalLimit: 500 }, 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('accepts limits that fit together, and lets the monthly limit be cleared', async () => {
    await expect(service.update({ minimumWithdrawal: 500, maximumWithdrawal: 20000, dailyWithdrawalLimit: 20000, monthlyWithdrawalLimit: 100000 }, 'admin-1')).resolves.toBeDefined();

    repository.getOrCreate.mockResolvedValue({ ...current, monthlyWithdrawalLimit: '100000.00' });
    await expect(service.update({ monthlyWithdrawalLimit: null }, 'admin-1')).resolves.toBeDefined();
    expect(repository.update).toHaveBeenLastCalledWith('config-1', { monthlyWithdrawalLimit: null });
  });

  describe('TDS', () => {
    it('will not turn TDS on until the income tax section is set, because the returns need it', async () => {
      await expect(service.update({ tdsRate: 0.1 }, 'admin-1')).rejects.toThrow(/income tax section/i);
      await expect(service.update({ tdsRate: 0.1, tdsSection: '   ' }, 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('turns TDS on when the rate and the section come together', async () => {
      await expect(service.update({ tdsRate: 0.1, tdsSection: '194R', tdsAnnualThreshold: 20000 }, 'admin-1')).resolves.toBeDefined();
      expect(repository.update).toHaveBeenCalledWith('config-1', { tdsRate: 0.1, tdsSection: '194R', tdsAnnualThreshold: 20000 });
    });

    it('takes the section into account that was saved earlier', async () => {
      repository.getOrCreate.mockResolvedValue({ ...current, tdsSection: '194R' });
      await expect(service.update({ tdsRate: 0.05 }, 'admin-1')).resolves.toBeDefined();
    });

    it('will not clear the section while TDS is still on', async () => {
      repository.getOrCreate.mockResolvedValue({ ...current, tdsRate: '0.1000', tdsSection: '194R' });
      await expect(service.update({ tdsSection: null }, 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lets TDS be turned off, and the section cleared with it', async () => {
      repository.getOrCreate.mockResolvedValue({ ...current, tdsRate: '0.1000', tdsSection: '194R' });
      await expect(service.update({ tdsRate: 0, tdsSection: null }, 'admin-1')).resolves.toBeDefined();
    });
  });

  it('does not check the limits when the change is not about them', async () => {
    await expect(service.update({ maintenanceMode: true }, 'admin-1')).resolves.toBeDefined();
  });
});
