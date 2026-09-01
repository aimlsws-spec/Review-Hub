import { registerAs } from '@nestjs/config';

/**
 * gstNumber is a placeholder until the company registers for GST and provides
 * its real GSTIN — swap PLATFORM_GST_NUMBER in .env once that happens.
 */
export const platformConfig = registerAs('platform', () => ({
  gstNumber: process.env.PLATFORM_GST_NUMBER ?? 'PLACEHOLDER_GSTIN_NOT_CONFIGURED',
  gstRatePercent: Number(process.env.PLATFORM_GST_RATE_PERCENT ?? 18),
}));
