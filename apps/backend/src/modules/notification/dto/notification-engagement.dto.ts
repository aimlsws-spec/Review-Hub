import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const NOTIFICATION_ENGAGEMENTS = ['OPENED', 'CLICKED'] as const;
export type NotificationEngagement = (typeof NOTIFICATION_ENGAGEMENTS)[number];

/** OPENED: the person tapped the notification. CLICKED: they followed it to what it links to (counts as opened too). */
export class NotificationEngagementDto {
  @ApiProperty({ enum: NOTIFICATION_ENGAGEMENTS })
  @IsIn(NOTIFICATION_ENGAGEMENTS)
  action!: NotificationEngagement;
}
