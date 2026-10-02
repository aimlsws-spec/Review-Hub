import { Global, Module } from '@nestjs/common';

import { BankDetailsProtector } from './bank-details-protector';
import { FieldEncryptionService } from './field-encryption.service';

/** Column encryption, available everywhere: bank details today, other sensitive columns as they are added. */
@Global()
@Module({
  providers: [FieldEncryptionService, BankDetailsProtector],
  exports: [FieldEncryptionService, BankDetailsProtector],
})
export class CryptoModule {}
