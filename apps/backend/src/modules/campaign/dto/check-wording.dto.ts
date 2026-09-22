import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

const TEXT_MAX = 10_000;
const MAX_TASKS = 20;

export class CheckWordingTaskDto {
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(300) title?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(TEXT_MAX) description?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(TEXT_MAX) instructions?: string;
}

/** The wording of a campaign, checked against the honest-feedback policy before anything is saved. */
export class CheckWordingDto {
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(300) title?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(500) shortDescription?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(TEXT_MAX) description?: string;

  @ApiPropertyOptional({ type: [CheckWordingTaskDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_TASKS)
  @ValidateNested({ each: true })
  @Type(() => CheckWordingTaskDto)
  tasks?: CheckWordingTaskDto[];
}
