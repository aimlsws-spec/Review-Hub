import { Global, Module } from '@nestjs/common';

import { BankDetailsProtector } from './bank-details-protector';
import { FieldEncryptionService } from './field-encryption.service';
import { IdentityNumberProtector } from './identity-number-protector';

/** Column encryption, available everywhere: bank details and identity numbers, other sensitive columns as they are added. */
@Global()
@Module({
  providers: [FieldEncryptionService, BankDetailsProtector, IdentityNumberProtector],
  exports: [FieldEncryptionService, BankDetailsProtector, IdentityNumberProtector],
})
export class CryptoModule {}
