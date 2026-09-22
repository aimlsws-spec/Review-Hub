import { ValidationPipe } from '@nestjs/common';

import { AiVerificationDecision, CompleteVerificationJobDto } from './complete-verification-job.dto';

describe('CompleteVerificationJobDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (value: unknown) => pipe.transform(value, { type: 'body', metatype: CompleteVerificationJobDto });
  const base = { decision: AiVerificationDecision.APPROVE, confidence: 0.9 };

  it('still accepts a result with no fingerprint (text-only or video evidence)', async () => {
    await expect(validate(base)).resolves.toMatchObject(base);
  });

  it('accepts a 16-character lowercase hex fingerprint and the words read from the image', async () => {
    await expect(validate({ ...base, perceptualHash: '9f3a1c0e7b2d4a58', evidenceText: 'follow the brand' })).resolves.toMatchObject({
      perceptualHash: '9f3a1c0e7b2d4a58',
      evidenceText: 'follow the brand',
    });
  });

  it('accepts null fingerprint fields, which is what the worker sends when there is no image', async () => {
    await expect(validate({ ...base, perceptualHash: null, evidenceText: null })).resolves.toBeDefined();
  });

  it('accepts an empty evidenceText, meaning OCR ran and found no meaningful text', async () => {
    await expect(validate({ ...base, perceptualHash: '9f3a1c0e7b2d4a58', evidenceText: '' })).resolves.toMatchObject({ evidenceText: '' });
  });

  it.each(['', 'nothex', '9f3a1c0e7b2d4a5', '9f3a1c0e7b2d4a588', '9F3A1C0E7B2D4A58', '9f3a1c0e7b2d4a5z'])(
    'rejects a malformed fingerprint (%j), because it would be compared against real pictures',
    async (perceptualHash) => {
      await expect(validate({ ...base, perceptualHash })).rejects.toBeDefined();
    },
  );

  it('rejects evidence text over 1000 characters', async () => {
    await expect(validate({ ...base, evidenceText: 'x'.repeat(1001) })).rejects.toBeDefined();
  });
});
