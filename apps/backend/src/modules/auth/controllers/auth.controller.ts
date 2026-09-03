import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser, Public } from '@common/decorators';

import {
  RegisterDto,
  LoginDto,
  RefreshDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SendOtpDto,
  VerifyOtpDto,
  ResendOtpDto,
  ChangePasswordDto,
  UpdateProfileDto,
  UpdatePushTokenDto,
} from '../dto';
import { AuthService } from '../services/auth.service';
import { AppleProfile } from '../strategies/apple.strategy';
import { GoogleProfile } from '../strategies/google.strategy';

@ApiTags(SWAGGER_TAGS.AUTH)
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.ip, req.headers['user-agent'], {
      isRooted: dto.isRooted,
      isEmulator: dto.isEmulator,
      xForwardedFor: req.headers['x-forwarded-for'] as string | undefined,
      via: req.headers['via'] as string | undefined,
    });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Authenticate user with email/phone and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiBody({ type: LoginDto })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.email, dto.phone, dto.password, req.ip, req.headers['user-agent'], dto.rememberMe, {
      isRooted: dto.isRooted,
      isEmulator: dto.isEmulator,
      xForwardedFor: req.headers['x-forwarded-for'] as string | undefined,
      via: req.headers['via'] as string | undefined,
    });
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Start Google sign-in (redirects to Google)' })
  googleAuth(): void {
    // Guard handles the redirect to Google's consent screen; this body never runs.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google sign-in callback' })
  async googleAuthCallback(@Req() req: Request) {
    const profile = req.user as GoogleProfile;
    return this.authService.socialLogin({
      provider: 'google',
      providerId: profile.providerId,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      xForwardedFor: req.headers['x-forwarded-for'] as string | undefined,
      via: req.headers['via'] as string | undefined,
    });
  }

  @Public()
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Start Apple sign-in (redirects to Apple)' })
  appleAuth(): void {
    // Guard handles the redirect to Apple's consent screen; this body never runs.
  }

  @Public()
  @Post('apple/callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple sign-in callback (Apple posts here with response_mode=form_post)' })
  async appleAuthCallback(@Req() req: Request) {
    const profile = req.user as AppleProfile;
    return this.authService.socialLogin({
      provider: 'apple',
      providerId: profile.providerId,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      xForwardedFor: req.headers['x-forwarded-for'] as string | undefined,
      via: req.headers['via'] as string | undefined,
    });
  }

  @Patch('devices/push-token')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Register or update the current device's push notification token" })
  @ApiBody({ type: UpdatePushTokenDto })
  async updatePushToken(@CurrentUser() user: { id: string; sessionId?: string }, @Body() dto: UpdatePushTokenDto) {
    await this.authService.updatePushToken(user.sessionId, dto.pushToken);
    return { message: 'Push token updated' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  async logout(@CurrentUser() user: { id: string; sessionId?: string }) {
    await this.authService.logout(user.id, user.sessionId);
    return { message: 'Logged out successfully' };
  }

  @Post('logout/all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  async logoutAll(@CurrentUser('id') userId: string) {
    await this.authService.logoutAllDevices(userId);
    return { message: 'Logged out from all devices' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: RefreshDto })
  async refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refreshTokens(dto.refreshToken, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Revoke a specific refresh token' })
  @ApiBody({ type: RefreshDto })
  async revokeRefreshToken(@Body() dto: RefreshDto) {
    await this.authService.revokeRefreshToken(dto.refreshToken);
    return { message: 'Refresh token revoked successfully' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email, dto.phone);
    return { message: 'If the account exists, an OTP has been sent.' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @ApiOperation({ summary: 'Reset password using OTP code' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.email, dto.phone, dto.code, dto.password);
    return { message: 'Password reset successfully' };
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Send OTP for email/phone verification' })
  @ApiBody({ type: SendOtpDto })
  async sendOtp(@CurrentUser('id') userId: string, @Body() dto: SendOtpDto) {
    return this.authService.sendOtp(userId, dto.type);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify OTP code' })
  @ApiBody({ type: VerifyOtpDto })
  async verifyOtp(@CurrentUser('id') userId: string, @Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(userId, dto.type, dto.code);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend OTP code' })
  @ApiBody({ type: ResendOtpDto })
  async resendOtp(@CurrentUser('id') userId: string, @Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(userId, dto.type);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({ type: UpdateProfileDto })
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(userId, dto);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current password' })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
    return { message: 'Password changed successfully' };
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user account (soft delete)' })
  async deleteAccount(@CurrentUser('id') userId: string) {
    await this.authService.deleteAccount(userId);
    return { message: 'Account deleted successfully' };
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable two-factor authentication' })
  @ApiOkResponse({ description: 'Two-factor authentication enabled' })
  @ApiBody({ schema: { properties: { code: { type: 'string', example: '123456' } } } })
  async enableTwoFactor(@CurrentUser('id') userId: string, @Body('code') code: string) {
    return this.authService.enableTwoFactor(userId, code);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable two-factor authentication' })
  @ApiOkResponse({ description: 'Two-factor authentication disabled' })
  @ApiBody({ schema: { properties: { code: { type: 'string', example: '123456' } } } })
  async disableTwoFactor(@CurrentUser('id') userId: string, @Body('code') code: string) {
    return this.authService.disableTwoFactor(userId, code);
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify two-factor authentication code' })
  @ApiOkResponse({ description: 'Two-factor authentication verified' })
  @ApiBody({ schema: { properties: { code: { type: 'string', example: '123456' } } } })
  async verifyTwoFactor(@CurrentUser('id') userId: string, @Body('code') code: string) {
    return this.authService.verifyTwoFactor(userId, code);
  }

  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  @ApiOkResponse({ description: 'Active sessions retrieved' })
  async getActiveSessions(@CurrentUser('id') userId: string) {
    return this.authService.getActiveSessions(userId);
  }

  @Get('permissions')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user permissions' })
  async getUserPermissions(@CurrentUser() user: { id: string }) {
    return this.authService.getUserPermissions(user.id);
  }

  @Get('roles')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user roles' })
  async getUserRoles(@CurrentUser() user: { id: string }) {
    return this.authService.getUserRoles(user.id);
  }
}
