/**
 * Encrypts bank account numbers and UPI IDs written before column encryption existed, and fills in the hash and
 * last-four columns those rows lack (migration 20261002120000_encrypt_bank_details).
 *
 *   npm run db:encrypt-bank-details            (from apps/backend)
 *
 * Safe to run any number of times: a row is only touched while something about it is still unencrypted, so a second
 * run finds nothing to do. The deploy script runs it straight after `prisma migrate deploy`. Until it has run, the app
 * still reads the old rows (plain values pass through decryption unchanged), but the duplicate-account check and the
 * shared-bank-account fraud signal do not see them, since those compare hashes.
 *
 * It uses the same keys as the app (FIELD_ENCRYPTION_KEY, FIELD_HASH_KEY): run it with the app's .env.
 */
import * as fs from 'fs';
import * as path from 'path';

import { PrismaClient } from '@prisma/client';

import { BankDetailsProtector } from '../../src/shared/crypto/bank-details-protector';
import { DEVELOPMENT_ENCRYPTION_KEY, DEVELOPMENT_HASH_KEY, FieldCipher } from '../../src/shared/crypto/field-cipher';
import type { FieldEncryptionService } from '../../src/shared/crypto/field-encryption.service';

const BATCH = 200;
const ENCRYPTED_PREFIX = 'enc:v1:';

/** Same files, same order, as the app's ConfigModule: .env.local wins over .env, and real env vars win over both. */
function loadEnvFiles(): void {
  for (const file of ['.env.local', '.env']) {
    const full = path.resolve(__dirname, '..', '..', file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (!match || match[1] in process.env) continue;
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

function buildProtector(): { protector: BankDetailsProtector; cipher: FieldCipher } {
  const key = process.env.FIELD_ENCRYPTION_KEY ?? '';
  const hashKey = process.env.FIELD_HASH_KEY ?? '';
  if (!key || !hashKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FIELD_ENCRYPTION_KEY and FIELD_HASH_KEY must be set in production. Nothing was changed.');
    }
    console.warn('FIELD_ENCRYPTION_KEY / FIELD_HASH_KEY are not set: using the built-in DEVELOPMENT keys, as the app does.');
  }
  const cipher = new FieldCipher({
    key: key || DEVELOPMENT_ENCRYPTION_KEY,
    previousKeys: (process.env.FIELD_ENCRYPTION_PREVIOUS_KEYS ?? '').split(',').map((k) => k.trim()).filter(Boolean),
    hashKey: hashKey || DEVELOPMENT_HASH_KEY,
  });
  return { protector: new BankDetailsProtector(cipher as FieldEncryptionService), cipher };
}

/** A row still needs work while its hash is missing or its UPI ID is still plain text. */
const needsWork = {
  OR: [{ accountNumberHash: null }, { AND: [{ upiId: { not: null } }, { NOT: { upiId: { startsWith: ENCRYPTED_PREFIX } } }] }],
};

interface StoredRow {
  id: string;
  accountNumber: string;
  upiId: string | null;
}

/** The columns to write for one row: everything encrypted, decrypting first whatever already is. */
function sealRow(row: StoredRow, protector: BankDetailsProtector, cipher: FieldCipher) {
  return protector.seal({
    accountNumber: cipher.decrypt(row.accountNumber),
    upiId: row.upiId === null ? null : cipher.decrypt(row.upiId),
  });
}

async function main(): Promise<void> {
  loadEnvFiles();
  const { protector, cipher } = buildProtector();
  const prisma = new PrismaClient();

  try {
    let users = 0;
    for (;;) {
      const rows = await prisma.userBankAccount.findMany({ where: needsWork, select: { id: true, accountNumber: true, upiId: true }, take: BATCH });
      if (rows.length === 0) break;
      for (const row of rows) {
        await prisma.userBankAccount.update({ where: { id: row.id }, data: sealRow(row, protector, cipher) });
      }
      users += rows.length;
    }

    let merchants = 0;
    for (;;) {
      const rows = await prisma.merchantBankAccount.findMany({ where: needsWork, select: { id: true, accountNumber: true, upiId: true }, take: BATCH });
      if (rows.length === 0) break;
      for (const row of rows) {
        await prisma.merchantBankAccount.update({ where: { id: row.id }, data: sealRow(row, protector, cipher) });
      }
      merchants += rows.length;
    }

    console.log(`Bank details encrypted: ${users} user account(s), ${merchants} merchant account(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
