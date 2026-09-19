import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Response shape for `GET /tasks/recommended` — no request body. */
export class RecommendedTaskDto {
  @ApiProperty()
  taskId!: string;

  @ApiProperty()
  campaignId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  campaignTitle!: string;

  @ApiPropertyOptional()
  thumbnailUrl!: string | null;

  @ApiProperty({ description: 'Decimal amount as a string, e.g. "150.00"' })
  rewardAmount!: string;

  @ApiProperty()
  minimumTimeSeconds!: number;

  @ApiProperty()
  isHighReward!: boolean;

  @ApiProperty()
  isQuickTask!: boolean;
}
