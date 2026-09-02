import { registerAs } from '@nestjs/config';

export const firebaseConfig = registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID ?? '',
  // .env stores the PEM with literal "\n" escapes since it can't hold real newlines.
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
}));
