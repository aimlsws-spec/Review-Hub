import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdatePushTokenDto {
  @ApiProperty({ example: 'fcm-device-token', description: 'Firebase Cloud Messaging registration token' })
  @IsString()
  @MinLength(10)
  pushToken!: string;
}
