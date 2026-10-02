import { Injectable } from '@nestjs/common';

import { FieldEncryptionService } from './field-encryption.service';

/** The bank columns as they are stored: encrypted number and UPI ID, plus the hash and last four digits. */
export interface StoredBankColumns {
  accountNumber: string;
  accountNumberHash: string;
  accountNumberLast4: string;
  upiId: string | null;
}

/** The shape of any bank account row this class can read: user or merchant, before or after the backfill. */
export interface BankRow {
  accountNumber: string;
  upiId: string | null;
  accountNumberHash?: string | null;
  accountNumberLast4?: string | null;
}

type Presented<T extends BankRow> = Omit<T, 'accountNumberHash'>;

/**
 * The one place that knows how bank account numbers and UPI IDs are kept: encrypted at rest, with a keyed hash of
 * the number for "same account?" lookups and its last four digits for display.
 *
 * Reading has two views, and the safe one is the default everywhere:
 * - `mask`: the number becomes `XXXX1234`. For every API response and anything a person sees.
 * - `reveal`: the real number. Only for sending a payout to the gateway, and for the admin screens where staff
 *   pay by hand or check a merchant's bank details against their documents.
 * Both drop the hash, which has no use outside lookups.
 */
@Injectable()
export class BankDetailsProtector {
  constructor(private readonly cipher: FieldEncryptionService) {}

  /** Columns to write for a new account. */
  seal(input: { accountNumber: string; upiId?: string | null }): StoredBankColumns {
    const accountNumber = BankDetailsProtector.normalise(input.accountNumber);
    return {
      accountNumber: this.cipher.encrypt(accountNumber),
      accountNumberHash: this.hashAccountNumber(accountNumber),
      accountNumberLast4: accountNumber.slice(-4),
      upiId: this.sealUpi(input.upiId),
    };
  }

  /** The stored form of a UPI ID: encrypted, or null when there is none. */
  sealUpi(upiId: string | null | undefined): string | null {
    const value = upiId?.trim();
    return value ? this.cipher.encrypt(value) : null;
  }

  /** The keyed hash to look an account number up by. Same normalisation as when it was stored. */
  hashAccountNumber(accountNumber: string): string {
    return this.cipher.blindIndex(BankDetailsProtector.normalise(accountNumber));
  }

  mask<T extends BankRow>(row: T): Presented<T> {
    const rest = BankDetailsProtector.withoutHash(row);
    const last4 = row.accountNumberLast4 ?? this.cipher.decrypt(row.accountNumber).slice(-4);
    return { ...rest, accountNumber: `XXXX${last4}`, upiId: this.openUpi(row.upiId) };
  }

  reveal<T extends BankRow>(row: T): Presented<T> {
    const rest = BankDetailsProtector.withoutHash(row);
    return { ...rest, accountNumber: this.cipher.decrypt(row.accountNumber), upiId: this.openUpi(row.upiId) };
  }

  /** Masks the `bankAccount` nested in a withdrawal or refund, when there is one. */
  maskNested<T extends { bankAccount?: BankRow | null }>(record: T): T {
    return record.bankAccount ? { ...record, bankAccount: this.mask(record.bankAccount) } : record;
  }

  revealNested<T extends { bankAccount?: BankRow | null }>(record: T): T {
    return record.bankAccount ? { ...record, bankAccount: this.reveal(record.bankAccount) } : record;
  }

  private openUpi(stored: string | null): string | null {
    return stored === null ? null : this.cipher.decrypt(stored);
  }

  private static withoutHash<T extends BankRow>(row: T): Presented<T> {
    const copy: Partial<T> = { ...row };
    delete copy.accountNumberHash;
    return copy as Presented<T>;
  }

  /** Spaces and dashes are how people type long numbers, not part of them. */
  static normalise(accountNumber: string): string {
    return accountNumber.replace(/[\s-]/g, '');
  }
}
