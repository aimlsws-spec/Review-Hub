import { ValidationPipe } from '@nestjs/common';

import { UpdateMerchantDto } from './update-merchant.dto';

describe('UpdateMerchantDto store location', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (value: object) => pipe.transform(value, { type: 'body', metatype: UpdateMerchantDto });

  it('accepts a store location', async () => {
    await expect(validate({ latitude: 23.0225, longitude: 72.5714 })).resolves.toMatchObject({ latitude: 23.0225, longitude: 72.5714 });
  });

  it('accepts null for both, to clear it', async () => {
    await expect(validate({ latitude: null, longitude: null })).resolves.toMatchObject({ latitude: null, longitude: null });
  });

  it.each([
    [{ latitude: 91, longitude: 72.5 }],
    [{ latitude: 23, longitude: 181 }],
    [{ latitude: 'north', longitude: 72.5 }],
  ])('refuses a point that is not on the map (%o)', async (value) => {
    await expect(validate(value)).rejects.toBeDefined();
  });
});
