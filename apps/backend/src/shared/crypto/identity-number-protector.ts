import { Injectable } from '@nestjs/common';

import { FieldEncryptionService } from './field-encryption.service';

/** The KYC columns as they are stored: the encrypted number and its keyed hash, both null when there is no number. */
export interface StoredIdentityNumber {
  documentNumber: string | null;
  documentNumberHash: string | null;
}

/** The shape of any KYC document row this class can present, before or after the backfill. */
export interface IdentityNumberRow {
  documentNumber: string | null;
  documentNumberHash?: string | null;
}

type Presented<T extends IdentityNumberRow> = Omit<T, 'documentNumberHash'>;

/**
 * The one place that knows how identity numbers (PAN, Aadhaar and the other KYC document numbers) are kept:
 * encrypted at rest, with a keyed hash for exact "same number?" lookups. Like BankDetailsProtector, reading has a
 * safe default and a deliberate exception:
 * - `mask`: `****234F`. For the person's own KYC screen, admin lists and anything else a person sees.
 * - `reveal`: the real number. Only for the admin reviewing that document and for tax records (TDS).
 */
@Injectable()
export class IdentityNumberProtector {
  constructor(private readonly cipher: FieldEncryptionService) {}

  /** Columns to write for a newly submitted number. */
  seal(documentNumber: string | null | undefined): StoredIdentityNumber {
    const value = documentNumber ? IdentityNumberProtector.normalise(documentNumber) : '';
    if (!value) return { documentNumber: null, documentNumberHash: null };
    return { documentNumber: this.cipher.encrypt(value), documentNumberHash: this.hash(value) };
  }

  /** The keyed hash to look a number up by. Same normalisation as when it was stored. */
  hash(documentNumber: string): string {
    return this.cipher.blindIndex(IdentityNumberProtector.normalise(documentNumber));
  }

  /** The stored form of a number copied elsewhere, such as the PAN on a TDS deduction. */
  encrypt(documentNumber: string | null | undefined): string | null {
    return this.seal(documentNumber).documentNumber;
  }

  /** The real number, from its stored form. Rows written before the backfill are plain text and pass through. */
  open(stored: string | null): string | null {
    return stored === null ? null : this.cipher.decrypt(stored);
  }

  mask<T extends IdentityNumberRow>(row: T): Presented<T> {
    const number = this.open(row.documentNumber);
    return { ...IdentityNumberProtector.withoutHash(row), documentNumber: number === null ? null : IdentityNumberProtector.maskNumber(number) };
  }

  reveal<T extends IdentityNumberRow>(row: T): Presented<T> {
    return { ...IdentityNumberProtector.withoutHash(row), documentNumber: this.open(row.documentNumber) };
  }

  /**
   * `****234F`: the last four characters, as the admin screens have always shown them. Kept here rather than in
   * @common/utils so the backfill script, which runs without path aliases, can load this file.
   */
  static maskNumber(value: string): string {
    return value.length < 4 ? '****' : `****${value.slice(-4)}`;
  }

  private static withoutHash<T extends IdentityNumberRow>(row: T): Presented<T> {
    const copy: Partial<T> = { ...row };
    delete copy.documentNumberHash;
    return copy as Presented<T>;
  }

  /** People type these with spaces or dashes and in either case (Aadhaar `1234 5678 9012`, PAN `abcde1234f`). */
  static normalise(documentNumber: string): string {
    return documentNumber.replace(/[\s-]/g, '').toUpperCase();
  }
}
