import { ValidationPipe } from '@nestjs/common';

import { IssueInvoiceNoteDto } from './issue-invoice-note.dto';

describe('IssueInvoiceNoteDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (value: unknown) => pipe.transform(value, { type: 'body', metatype: IssueInvoiceNoteDto });
  const valid = { type: 'CREDIT', taxableAmount: 500, reason: 'Fee billed twice' };

  it.each(['CREDIT', 'DEBIT'])('accepts a %s note, and trims the reason', async (type) => {
    await expect(validate({ ...valid, type, reason: '  Fee billed twice  ' })).resolves.toMatchObject({ type, reason: 'Fee billed twice' });
  });

  it.each([
    ['no type', { type: undefined }],
    ['a type that is neither', { type: 'REFUND' }],
    ['no amount', { taxableAmount: undefined }],
    ['an amount of zero', { taxableAmount: 0 }],
    ['a negative amount', { taxableAmount: -5 }],
    ['an amount with three decimals', { taxableAmount: 10.123 }],
    ['an amount above the cap', { taxableAmount: 10_000_001 }],
    ['an amount that is text', { taxableAmount: 'lots' }],
    ['no reason', { reason: undefined }],
    ['a reason that is too short', { reason: 'no' }],
    ['a reason over 500 characters', { reason: 'x'.repeat(501) }],
    ['a field it does not know', { merchantId: 'someone-else' }],
  ])('rejects %s', async (_label, override) => {
    await expect(validate({ ...valid, ...override })).rejects.toBeDefined();
  });

  it('accepts a single paisa and the cap exactly', async () => {
    await expect(validate({ ...valid, taxableAmount: 0.01 })).resolves.toBeDefined();
    await expect(validate({ ...valid, taxableAmount: 10_000_000 })).resolves.toBeDefined();
  });
});
