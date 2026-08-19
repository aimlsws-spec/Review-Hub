import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { SystemRole } from '@common/enums';

import { Roles } from '../../auth/decorators';
import { RolesGuard } from '../../auth/guards';
import { AuditLogQueryDto } from '../dto';
import { AuditLogViewerService } from '../services';

@ApiTags(SWAGGER_TAGS.AUDIT)
@Controller({ path: 'admin/audit-logs', version: '1' })
@UseGuards(RolesGuard)
@Roles(SystemRole.Admin)
@ApiBearerAuth()
export class AuditLogController {
  constructor(private readonly auditLogViewerService: AuditLogViewerService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List audit log entries' })
  async list(@Query() query: AuditLogQueryDto) {
    return this.auditLogViewerService.list(query);
  }
}
