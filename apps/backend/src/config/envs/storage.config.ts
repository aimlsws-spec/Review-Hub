import { registerAs } from '@nestjs/config';

export const storageConfig = registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER ?? 'local',
  localPath: process.env.STORAGE_LOCAL_PATH ?? './uploads',
  maxFileSizeMb: parseInt(process.env.STORAGE_MAX_FILE_SIZE_MB ?? '10', 10),
  allowedMimeTypes: (
    process.env.STORAGE_ALLOWED_MIME_TYPES ??
    'image/jpeg,image/png,image/webp,application/pdf,video/mp4'
  ).split(','),
}));
