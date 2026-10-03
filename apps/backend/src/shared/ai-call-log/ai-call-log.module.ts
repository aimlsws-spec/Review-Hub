import { Global, Module } from '@nestjs/common';

import { AiCallLogRepository } from './ai-call-log.repository';
import { AiCallLogService } from './ai-call-log.service';

/** Logging of outbound AI calls, available everywhere an AI call is made. */
@Global()
@Module({
  providers: [AiCallLogService, AiCallLogRepository],
  exports: [AiCallLogService],
})
export class AiCallLogModule {}
