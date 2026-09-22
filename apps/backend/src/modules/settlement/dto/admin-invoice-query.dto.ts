import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

import { InvoiceQueryDto } from './invoice-query.dto';

export class AdminInvoiceQueryDto extends InvoiceQueryDto {
  @ApiPropertyOptional({ description: 'Only this merchant’s invoices' })
  @IsOptional()
  @IsUUID()
  merchantId?: string;
}
