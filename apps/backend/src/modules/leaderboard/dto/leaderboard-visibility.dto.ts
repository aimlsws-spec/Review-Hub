import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class LeaderboardVisibilityDto {
  @ApiProperty({ description: 'false keeps the person off the leaderboard: they are not ranked and are never shown' })
  // The global pipe converts types implicitly, which turns any non-empty string, "false" included, into true.
  // Keeping the value as it was sent lets @IsBoolean refuse anything that is not a real true or false.
  @Transform(({ obj }: { obj: { visible?: unknown } }) => obj.visible)
  @IsBoolean()
  visible!: boolean;
}
