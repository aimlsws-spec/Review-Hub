import { Global, Module } from '@nestjs/common';

import { LocalStorageService } from './storage.service';

@Global()
@Module({
  providers: [LocalStorageService],
  exports: [LocalStorageService],
})
export class StorageModule {}
