import { Injectable } from '@nestjs/common';

export interface QrScanVerdict {
  passed: boolean;
  reason?: string;
}

/**
 * Checks a scanned code against the value a merchant set when creating a QR_SCAN task
 * (`CampaignTask.configuration.qrCode`) — the merchant prints that value as a QR code at
 * their store, out of band; the app never sees the expected value, only what was scanned.
 */
@Injectable()
export class QrScanVerificationService {
  verify(configuration: unknown, scannedCode: string | null | undefined): QrScanVerdict {
    const expected = this.expectedCode(configuration);

    if (!scannedCode || !scannedCode.trim()) {
      return { passed: false, reason: 'No QR code was scanned' };
    }
    if (!expected) {
      return { passed: false, reason: 'This task has no QR code configured' };
    }
    if (scannedCode.trim() !== expected) {
      return { passed: false, reason: 'That QR code does not match this task' };
    }
    return { passed: true };
  }

  private expectedCode(configuration: unknown): string | null {
    if (!configuration || typeof configuration !== 'object') return null;
    const value = (configuration as Record<string, unknown>).qrCode;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
