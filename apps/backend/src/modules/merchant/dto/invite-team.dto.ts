import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MerchantTeamRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

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
