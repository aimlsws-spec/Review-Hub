import { SystemRole } from '@common/enums';

import { AiCallLogService } from '../../../shared/ai-call-log';
import { ROLES_KEY } from '../../auth/decorators';

import { AdminAiMonitoringController } from './admin-ai-monitoring.controller';

describe('AdminAiMonitoringController', () => {
  const aiCallLog = { monitoring: jest.fn() };
  const controller = new AdminAiMonitoringController(aiCallLog as unknown as AiCallLogService);

  it('is for admins', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminAiMonitoringController)).toEqual([SystemRole.Admin]);
  });

  it('defaults to the last 30 days', async () => {
    await controller.getMonitoring({});
    await controller.getMonitoring({ days: 7 });

    expect(aiCallLog.monitoring).toHaveBeenNthCalledWith(1, 30);
    expect(aiCallLog.monitoring).toHaveBeenNthCalledWith(2, 7);
  });
});
