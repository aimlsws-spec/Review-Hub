import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

/** The token a sign-in from a new device returns, which ties the code the person types to that sign-in. */
export class LoginChallengeDto {
  @ApiProperty({ description: 'challengeToken from the sign-in response' })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/, { message: 'Invalid challenge token' })
  challengeToken!: string;
}

export class VerifyNewDeviceDto extends LoginChallengeDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
