import { ValidationPipe } from '@nestjs/common';

import { MarkWithdrawalFailedDto, MarkWithdrawalPaidDto } from './mark-withdrawal.dto';

describe('marking a withdrawal paid or failed', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (metatype: new () => object, value: unknown) => pipe.transform(value, { type: 'body', metatype });

  describe('MarkWithdrawalPaidDto', () => {
    it('accepts a reference and an optional note, trimming both', async () => {
      await expect(validate(MarkWithdrawalPaidDto, { reference: '  UTR123456789 ', note: '  Sent by NEFT ' })).resolves.toMatchObject({
        reference: 'UTR123456789',
        note: 'Sent by NEFT',
      });
    });

    it.each([
      ['no reference', {}],
      ['a reference that is too short', { reference: 'AB12' }],
      ['a reference with spaces inside', { reference: 'UTR 123 456' }],
      ['a reference with symbols', { reference: 'UTR;DROP' }],
      ['a note over 500 characters', { reference: 'UTR123456789', note: 'x'.repeat(501) }],
      ['a field it does not know', { reference: 'UTR123456789', amount: 5 }],
    ])('rejects %s', async (_label, body) => {
      await expect(validate(MarkWithdrawalPaidDto, body)).rejects.toBeDefined();
    });
  });

  describe('MarkWithdrawalFailedDto', () => {
    it('accepts a reason, trimmed', async () => {
      await expect(validate(MarkWithdrawalFailedDto, { reason: '  Account number rejected  ' })).resolves.toMatchObject({ reason: 'Account number rejected' });
    });

    it.each([
      ['no reason', {}],
      ['a blank reason', { reason: '     ' }],
      ['a reason that is too short', { reason: 'no' }],
      ['a reason over 500 characters', { reason: 'x'.repeat(501) }],
    ])('rejects %s', async (_label, body) => {
      await expect(validate(MarkWithdrawalFailedDto, body)).rejects.toBeDefined();
    });
  });
});
