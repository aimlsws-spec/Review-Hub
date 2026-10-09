import { ValidationPipe } from '@nestjs/common';

import { AddBankDto, UpdateBankDto } from './add-bank.dto';

describe('AddBankDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (value: unknown) => pipe.transform(value, { type: 'body', metatype: AddBankDto });
  const valid = {
    bankName: 'State Bank of India',
    accountHolderName: 'Prerna Test Cafe Private Limited',
    accountNumber: '123456789012',
    ifscCode: 'SBIN0001234',
  };

  it('trims stray spaces and tabs from every text field before storing them', async () => {
    await expect(
      validate({
        bankName: '\tState Bank of India ',
        accountHolderName: '  Prerna Test Cafe Private Limited\t',
        accountNumber: ' 123456789012 ',
        ifscCode: ' SBIN0001234\t',
        branch: '  Ahmedabad Main ',
        upiId: ' prerna@sbi ',
      }),
    ).resolves.toMatchObject({
      bankName: 'State Bank of India',
      accountHolderName: 'Prerna Test Cafe Private Limited',
      accountNumber: '123456789012',
      ifscCode: 'SBIN0001234',
      branch: 'Ahmedabad Main',
      upiId: 'prerna@sbi',
    });
  });

  it('rejects a bank name that is only whitespace around a single letter', async () => {
    await expect(validate({ ...valid, bankName: '\t S \t' })).rejects.toBeDefined();
  });
});

describe('UpdateBankDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

  it('trims the fields it changes', async () => {
    await expect(
      pipe.transform({ bankName: ' HDFC Bank\t', branch: '\tMumbai ' }, { type: 'body', metatype: UpdateBankDto }),
    ).resolves.toMatchObject({ bankName: 'HDFC Bank', branch: 'Mumbai' });
  });
});
