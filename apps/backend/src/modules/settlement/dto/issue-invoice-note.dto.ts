import { ApiProperty } from '@nestjs/swagger';
import { InvoiceNoteType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';


const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** An admin issuing a credit or debit note against a GST invoice. */
export class IssueInvoiceNoteDto {
  @ApiProperty({ enum: InvoiceNoteType, description: 'CREDIT lowers what the invoice charged; DEBIT adds to it.' })
  @IsEnum(InvoiceNoteType)
  type!: InvoiceNoteType;

  @ApiProperty({ example: 500, description: 'The amount before GST, in rupees. GST is added at the invoice rate.' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10_000_000)
  taxableAmount!: number;

  @ApiProperty({ example: 'Service fee billed twice for the same period', maxLength: 500 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
