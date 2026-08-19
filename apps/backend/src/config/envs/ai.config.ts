import { registerAs } from '@nestjs/config';

export const aiConfig = registerAs('ai', () => ({
  serviceUrl: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
  apiKey: process.env.AI_SERVICE_API_KEY,
  timeoutMs: parseInt(process.env.AI_SERVICE_TIMEOUT_MS ?? '20000', 10),
}));
