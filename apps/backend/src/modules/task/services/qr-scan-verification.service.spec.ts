import { QrScanVerificationService } from './qr-scan-verification.service';

describe('QrScanVerificationService', () => {
  let service: QrScanVerificationService;

  beforeEach(() => {
    service = new QrScanVerificationService();
  });

  it('passes when the scanned code matches exactly', () => {
    expect(service.verify({ qrCode: 'STORE-42' }, 'STORE-42')).toEqual({ passed: true });
  });

  it('ignores surrounding whitespace on the scanned code', () => {
    expect(service.verify({ qrCode: 'STORE-42' }, '  STORE-42  ')).toEqual({ passed: true });
  });

  it('fails when nothing was scanned', () => {
    const verdict = service.verify({ qrCode: 'STORE-42' }, null);
    expect(verdict.passed).toBe(false);
    expect(verdict.reason).toMatch(/no qr code/i);
  });

  it('fails when the scanned code does not match', () => {
    const verdict = service.verify({ qrCode: 'STORE-42' }, 'STORE-99');
    expect(verdict.passed).toBe(false);
    expect(verdict.reason).toMatch(/does not match/i);
  });

  it('fails safe when the task has no configured code', () => {
    expect(service.verify({}, 'STORE-42').passed).toBe(false);
    expect(service.verify(null, 'STORE-42').passed).toBe(false);
  });

  it('is case-sensitive: a code is a code, not a word', () => {
    expect(service.verify({ qrCode: 'STORE-42' }, 'store-42').passed).toBe(false);
  });
});
