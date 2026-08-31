export const USER_DOCUMENT_STORAGE = {
  FOLDER: 'user',
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  MAX_FILE_SIZE: 10 * 1024 * 1024,
} as const;
