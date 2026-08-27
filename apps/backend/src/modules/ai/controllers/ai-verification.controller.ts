import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';

import { Public } from '@common/decorators';
import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { CompleteVerificationJobDto } from '../dto';
import { ApiKeyGuard } from '../guards';
import { AiVerificationService } from '../services';

/**
 * Consumed only by apps/ai-services (a separate machine/process), never by
 * end users or the web portals — hence API-key auth instead of JWT, and
 * excluded from the public Swagger surface.
 */
@ApiExcludeController()
@Controller({ path: 'internal/ai/verification-jobs', version: '1' })
@Public()
@UseGuards(ApiKeyGuard)
export class AiVerificationController {
  constructor(private readonly aiVerificationService: AiVerificationService) {}

  @Get('next')
  @HttpCode(HttpStatus.OK)
  async claimNext(@Query('engine') engine?: string, @Query('model') model?: string) {
    if (!engine) throw new BadRequestException('The "engine" query parameter is required');
    const job = await this.aiVerificationService.claimNextJob(engine, model);
    return { job };
  }

  @Post(':jobId/complete')
  @HttpCode(HttpStatus.OK)
  async complete(@Param('jobId') jobId: string, @Body() dto: CompleteVerificationJobDto) {
    return this.aiVerificationService.completeJob(jobId, dto);
  }

  @Post(':jobId/fail')
  @HttpCode(HttpStatus.OK)
  async fail(@Param('jobId') jobId: string, @Body('errorMessage') errorMessage: string) {
    return this.aiVerificationService.markFailed(jobId, errorMessage ?? 'Unknown error');
  }

  @Get(':jobId/evidence')
  @HttpCode(HttpStatus.OK)
  async getEvidence(@Param('jobId') jobId: string, @Res() res: Response) {
    const filePath = await this.aiVerificationService.getEvidenceFilePath(jobId);
    res.sendFile(filePath);
  }
}
