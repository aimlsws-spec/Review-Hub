import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MerchantTeamRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class InviteTeamDto {
  @ApiProperty({ example: 'teammate@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: MerchantTeamRole, example: 'MANAGER' })
  @IsEnum(MerchantTeamRole)
  role!: MerchantTeamRole;
}

export class UpdateTeamDto {
  @ApiProperty({ enum: MerchantTeamRole, example: 'ADMIN' })
  @IsEnum(MerchantTeamRole)
  role!: MerchantTeamRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permissions?: string;
}

/** The token from the invitation email. Sent in the body so it never appears in request logs. */
export class AcceptInviteDto {
  @ApiProperty({ example: '3f2c1d4e-8b9a-4c7d-9e1f-0a2b3c4d5e6f' })
  @IsUUID()
  token!: string;
}
