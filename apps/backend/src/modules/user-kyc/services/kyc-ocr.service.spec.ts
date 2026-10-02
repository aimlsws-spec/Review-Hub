import { of, throwError } from 'rxjs';

import { KycOcrService } from './kyc-ocr.service';

describe('KycOcrService', () => {
  const http = { post: jest.fn() };
  const config = {
    get: (key: string) => ({ 'ai.serviceUrl': 'http://ai.local', 'ai.apiKey': 'key', 'ai.apiSecret': 'secret', 'ai.timeoutMs': 1000 })[key],
  };
  const prisma = { user: { findUnique: jest.fn() } };
  const documents = { update: jest.fn() };
  let service: KycOcrService;

  const input = {
    documentId: 'doc-1',
    userId: 'user-1',
    documentType: 'PAN' as const,
    documentNumber: 'ABCPD1234F',
    buffer: Buffer.from('fake-image'),
    mimeType: 'image/jpeg',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue({ firstName: 'Rahul', lastName: 'Sharma' });
    service = new KycOcrService(http as never, config as never, prisma as never, documents as never);
  });

  it('sends the image, typed number and account name, and stores only the match flags', async () => {
    http.post.mockReturnValue(of({ data: { status: 'MATCH', numberMatches: true, nameMatches: true, confidence: 1, extra: 'ignored' } }));

    const result = await service.check(input);

    expect(result).toEqual({ status: 'MATCH', numberMatches: true, nameMatches: true, confidence: 1 });
    const [url, form, options] = http.post.mock.calls[0];
    expect(url).toBe('http://ai.local/v1/kyc/read');
    expect((form as FormData).get('documentNumber')).toBe('ABCPD1234F');
    expect((form as FormData).get('fullName')).toBe('Rahul Sharma');
    expect(options.headers).toEqual({ 'X-Api-Key': 'key', 'X-Api-Secret': 'secret' });
    expect(documents.update).toHaveBeenCalledWith('doc-1', { ocrCheck: result, ocrCheckedAt: expect.any(Date) });
  });

  it('records UNAVAILABLE, and does not throw, when the AI service is down', async () => {
    http.post.mockReturnValue(throwError(() => new Error('connect ECONNREFUSED')));

    await expect(service.check(input)).resolves.toMatchObject({ status: 'UNAVAILABLE', numberMatches: null });
    expect(documents.update).toHaveBeenCalledWith('doc-1', expect.objectContaining({ ocrCheck: expect.objectContaining({ status: 'UNAVAILABLE' }) }));
  });

  it('does not send a PDF, which the OCR can not read, and says so', async () => {
    await expect(service.check({ ...input, mimeType: 'application/pdf' })).resolves.toMatchObject({ status: 'NOT_AN_IMAGE' });
    expect(http.post).not.toHaveBeenCalled();
  });

  it('treats an unknown status from the AI service as unavailable, never as a match', async () => {
    http.post.mockReturnValue(of({ data: { status: 'APPROVED', confidence: 7 } }));
    await expect(service.check(input)).resolves.toEqual({ status: 'UNAVAILABLE', numberMatches: null, nameMatches: null, confidence: 1 });
  });

  it('checkInBackground never throws, even when saving the result fails', async () => {
    http.post.mockReturnValue(of({ data: { status: 'MATCH' } }));
    documents.update.mockRejectedValue(new Error('database gone'));

    expect(() => service.checkInBackground(input)).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
  });
});
