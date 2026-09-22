import { Test, TestingModule } from '@nestjs/testing';

import { SystemRole } from '@common/enums';
import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { ROLES_KEY } from '../../auth/decorators';
import { TdsReportService } from '../services';

import { AdminTdsController } from './admin-tds.controller';

describe('AdminTdsController', () => {
  let controller: AdminTdsController;
  const reportService = { list: jest.fn(), exportCsv: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminTdsController],
      providers: [{ provide: TdsReportService, useValue: reportService }],
    }).compile();
    controller = module.get(AdminTdsController);
    jest.clearAllMocks();
  });

  it('lists a financial year, with sane paging', async () => {
    await controller.list('2026-27', 'DEDUCTED', '2', '10');
    await controller.list(undefined, undefined, 'abc', '9999');

    expect(reportService.list).toHaveBeenNthCalledWith(1, { financialYear: '2026-27', status: 'DEDUCTED', page: 2, limit: 10 });
    expect(reportService.list).toHaveBeenNthCalledWith(2, { financialYear: undefined, status: undefined, page: 1, limit: 100 });
  });

  it('refuses a status that does not exist', async () => {
    await expect(controller.list(undefined, 'PENDING')).rejects.toBeInstanceOf(BadRequestException);
    expect(reportService.list).not.toHaveBeenCalled();
  });

  it('sends the export as a file download', async () => {
    reportService.exportCsv.mockResolvedValue({ filename: 'tds-2026-27.csv', content: 'a,b\r\n' });
    const res = { setHeader: jest.fn(), send: jest.fn() };

    await controller.export(res as never, '2026-27');

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="tds-2026-27.csv"');
    expect(res.send).toHaveBeenCalledWith('a,b\r\n');
  });

  it('is for admins only', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminTdsController)).toContain(SystemRole.Admin);
  });
});
