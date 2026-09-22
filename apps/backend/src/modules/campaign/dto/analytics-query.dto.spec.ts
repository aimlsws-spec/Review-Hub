import { ValidationPipe } from '@nestjs/common';

import { AnalyticsQueryDto } from './analytics-query.dto';

describe('AnalyticsQueryDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (value: unknown) => pipe.transform(value, { type: 'query', metatype: AnalyticsQueryDto });

  it('looks back 30 days when nothing is asked for', async () => {
    await expect(validate({})).resolves.toMatchObject({ days: 30 });
  });

  it.each([7, 30, 90])('accepts %d days, sent as text in a query string', async (days) => {
    await expect(validate({ days: String(days) })).resolves.toMatchObject({ days });
  });

  it.each(['0', '1', '365', '-7', '15', 'abc', '30.5'])('refuses %s days', async (days) => {
    await expect(validate({ days })).rejects.toBeDefined();
  });

  it('refuses a field it does not know', async () => {
    await expect(validate({ days: '7', merchantId: 'someone-else' })).rejects.toBeDefined();
  });
});
