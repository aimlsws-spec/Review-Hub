import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RefreshJwtGuard } from './guards/refresh-jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthListener } from './listeners/auth.listener';
import { DeviceRepository } from './repositories/device.repository';
import { LoginHistoryRepository } from './repositories/login-history.repository';
import { OtpRepository } from './repositories/otp.repository';
import { SessionRepository } from './repositories/session.repository';
import { UserRepository } from './repositories/user.repository';
import { AuthService } from './services/auth.service';
import { DeviceService } from './services/device.service';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';
import { SessionService } from './services/session.service';
import { AppleStrategy } from './strategies/apple.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.accessSecret'),
        signOptions: { 
          expiresIn: config.get<string>('jwt.accessExpiresIn', '15m'),
          issuer: config.get<string>('jwt.issuer', 'viral-kar'),
          audience: config.get<string>('jwt.audience', 'viral-kar-users'),
          algorithm: 'HS256',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    DeviceService,
    PasswordService,
    OtpService,
    UserRepository,
    SessionRepository,
    DeviceRepository,
    OtpRepository,
    LoginHistoryRepository,
    JwtStrategy,
    RefreshJwtStrategy,
    GoogleStrategy,
    AppleStrategy,
    JwtAuthGuard,
    RefreshJwtGuard,
    RolesGuard,
    PermissionsGuard,
    AuthListener,
  ],
  exports: [
    AuthService,
    JwtModule,
    PassportModule,
    JwtAuthGuard,
    RefreshJwtGuard,
    RolesGuard,
    PermissionsGuard,
    UserRepository,
    DeviceRepository,
  ],
})
export class AuthModule {}
