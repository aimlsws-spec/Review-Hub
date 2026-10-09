import { ValidationPipe } from '@nestjs/common';

import { AdminCampaignQueryDto } from './admin-campaign-query.dto';

describe('AdminCampaignQueryDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (value: object) => pipe.transform(value, { type: 'query', metatype: AdminCampaignQueryDto });

  it('accepts the filters the admin portal sends, trimming the search', async () => {
    await expect(
      validate({ page: '2', limit: '20', status: 'ACTIVE', campaignType: 'REVIEW', merchantId: '5b1f6a3e-2c4d-4e8f-9a0b-1c2d3e4f5a6b', search: '  cake  ' }),
    ).resolves.toMatchObject({ page: 2, limit: 20, status: 'ACTIVE', search: 'cake' });
  });

  it('refuses an unknown status and a merchant id that is not a UUID', async () => {
    await expect(validate({ status: 'LIVE' })).rejects.toBeDefined();
    await expect(validate({ merchantId: 'merchant-1' })).rejects.toBeDefined();
  });
});
