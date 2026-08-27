import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AiAssistService } from './services';

/**
 * Deliberately separate from AiModule (which imports TaskModule for
 * submission verification) so TaskModule can import this module for
 * AiAssistService without creating a circular module dependency.
 */
@Module({
  imports: [HttpModule],
  providers: [AiAssistService],
  exports: [AiAssistService],
})
export class AiAssistModule {}
