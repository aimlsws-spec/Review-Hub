import { ValidationPipe } from '@nestjs/common';

import { MANUAL_TOP_UP } from '../constants';

import { ManualTopUpDto, TopUpReasonDto } from './manual-top-up.dto';

describe('ManualTopUpDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (value: unknown) => pipe.transform(value, { type: 'body', metatype: ManualTopUpDto });
  const valid = { amount: 25000, bankReference: 'UTR123456789', receivedOn: '2026-09-21' };

  it('accepts a complete request, and trims the reference and note', async () => {
    await expect(validate({ ...valid, bankReference: '  UTR123456789 ', note: '  From Brew Bar  ' })).resolves.toMatchObject({
      bankReference: 'UTR123456789',
      note: 'From Brew Bar',
    });
  });

  it.each([
    ['no amount', { amount: undefined }],
    ['a zero amount', { amount: 0 }],
    ['a negative amount', { amount: -500 }],
    ['an amount above the cap', { amount: MANUAL_TOP_UP.MAX_AMOUNT + 1 }],
    ['an amount with three decimals', { amount: 10.123 }],
    ['an amount that is text', { amount: 'lots' }],
    ['no reference', { bankReference: undefined }],
    ['a reference that is too short', { bankReference: 'AB12' }],
    ['a reference that is too long', { bankReference: 'A'.repeat(41) }],
    ['a reference with spaces inside', { bankReference: 'UTR 12345 6789' }],
    ['a reference with symbols', { bankReference: 'UTR;DROP TABLE' }],
    ['no date', { receivedOn: undefined }],
    ['a date in the wrong format', { receivedOn: '21/09/2026' }],
    ['a date with a time', { receivedOn: '2026-09-21T10:00:00Z' }],
    ['a note over 500 characters', { note: 'x'.repeat(501) }],
    ['a field it does not know', { walletId: 'someone-else' }],
  ])('rejects %s', async (_label, override) => {
    await expect(validate({ ...valid, ...override })).rejects.toBeDefined();
  });

  it('accepts the limits exactly', async () => {
    await expect(validate({ ...valid, amount: MANUAL_TOP_UP.MIN_AMOUNT })).resolves.toBeDefined();
    await expect(validate({ ...valid, amount: MANUAL_TOP_UP.MAX_AMOUNT })).resolves.toBeDefined();
    await expect(validate({ ...valid, amount: 99.99 })).resolves.toBeDefined();
    await expect(validate({ ...valid, bankReference: 'A'.repeat(40) })).resolves.toBeDefined();
    await expect(validate({ ...valid, bankReference: 'ABCDEF' })).resolves.toBeDefined();
  });

  it('allows slashes and dashes, which some banks put in references', async () => {
    await expect(validate({ ...valid, bankReference: 'NEFT/2026-09/123456' })).resolves.toBeDefined();
  });
});

describe('TopUpReasonDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (value: unknown) => pipe.transform(value, { type: 'body', metatype: TopUpReasonDto });

  it('accepts a reason, trimmed', async () => {
    await expect(validate({ reason: '  The amount was typed wrongly  ' })).resolves.toMatchObject({ reason: 'The amount was typed wrongly' });
  });

  it.each([
    ['no reason', {}],
    ['a blank reason', { reason: '      ' }],
    ['a reason that is too short', { reason: 'no' }],
    ['a reason over 500 characters', { reason: 'x'.repeat(501) }],
    ['a reason that is not text', { reason: 42 }],
    ['a field it does not know', { reason: 'A good reason', amount: 5 }],
  ])('rejects %s', async (_label, body) => {
    await expect(validate(body)).rejects.toBeDefined();
  });
});
