import { SystemRole } from '@common/enums';

import { ROLES_KEY } from '../../auth/decorators';
import { AdminDashboardService } from '../services';

import { AdminDashboardController } from './admin-dashboard.controller';

describe('AdminDashboardController', () => {
  const service = { getSeries: jest.fn() };
  const controller = new AdminDashboardController(service as unknown as AdminDashboardService);

  beforeEach(() => jest.clearAllMocks());

  it('is for admins', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminDashboardController)).toEqual([SystemRole.Admin]);
  });

  it('defaults to the last 30 days', async () => {
    await controller.getSeries({});
    await controller.getSeries({ days: 7 });

    expect(service.getSeries).toHaveBeenNthCalledWith(1, 30);
    expect(service.getSeries).toHaveBeenNthCalledWith(2, 7);
  });
});
