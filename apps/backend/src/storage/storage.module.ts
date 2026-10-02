import { Global, Module } from '@nestjs/common';

import { LocalStorageService } from './storage.service';
import { VirusScanService } from './virus-scan.service';

@Global()
@Module({
  providers: [LocalStorageService, VirusScanService],
  exports: [LocalStorageService, VirusScanService],
})
export class StorageModule {}
