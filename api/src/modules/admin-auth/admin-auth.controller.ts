import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { AdminSessionGuard } from './admin-session.guard';
import { ApiRes } from '../../common/api-response';
import { ADM } from '../../common/response-codes';
import { AdminAuthService } from './admin-auth.service';
import type { AuthenticatedAdmin } from './admin-auth.service';
import { CurrentAdmin } from './current-admin.decorator';
import {
  AdminLoginDto,
  ChallengeDto,
  SetupTwoFactorDto,
  VerifyApiKeyDto,
  VerifyCodeDto,
} from './dto/admin-auth.dto';

/**
 * Tenant-dashboard sign-in: email + password → 2FA → session.
 * Each step returns a short-lived `challengeToken` for the next one.
 * The platform API key is entered afterwards, inside the dashboard.
 */
@ApiTags('Admin - Auth')
@Controller('admin/auth')
@Public()
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Step 1 — email and password' })
  @ApiResponse({
    status: 200,
    description:
      'Next step: enroll | totp | email — or signed-in when the browser is trusted',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiResponse({ status: 429, description: 'Account locked' })
  async login(@Body() dto: AdminLoginDto, @Ip() ip: string) {
    const result = await this.auth.login(
      dto.email,
      dto.password,
      dto.deviceToken,
      ip,
    );
    return ApiRes(
      result.step === 'signed-in' ? ADM.SIGNED_IN : ADM.LOGIN_STEP,
      result,
    );
  }

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Step 2 (first sign-in) — choose authenticator app or e-mail',
  })
  @ApiResponse({
    status: 200,
    description: 'QR code (totp) or code sent (email)',
  })
  async setup(@Body() dto: SetupTwoFactorDto) {
    return ApiRes(
      ADM.TWO_FA_SETUP,
      await this.auth.setupTwoFactor(dto.challengeToken, dto.method),
    );
  }

  @Post('2fa/resend')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Re-send the e-mail sign-in code' })
  @ApiResponse({ status: 200, description: 'Code sent' })
  async resend(@Body() dto: ChallengeDto) {
    return ApiRes(
      ADM.CODE_SENT,
      await this.auth.resendEmailCode(dto.challengeToken),
    );
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Step 2 — verify the 6-digit code; returns the session',
  })
  @ApiResponse({ status: 200, description: 'Signed in' })
  @ApiResponse({ status: 401, description: 'Invalid or expired code' })
  async verify(@Body() dto: VerifyCodeDto, @Ip() ip: string) {
    return ApiRes(
      ADM.SIGNED_IN,
      await this.auth.verifyTwoFactor(
        dto.challengeToken,
        dto.code,
        ip,
        dto.rememberDevice === true,
      ),
    );
  }

  @Post('api-key/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminSessionGuard)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Check the platform API key for the signed-in admin',
  })
  @ApiResponse({ status: 200, description: 'API key valid' })
  @ApiResponse({ status: 403, description: 'Invalid super-admin API key' })
  async verifyApiKey(
    @Body() dto: VerifyApiKeyDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return ApiRes(
      ADM.API_KEY_VERIFIED,
      await this.auth.verifyApiKey(admin.id, dto.apiKey, dto.remember === true),
    );
  }

  @Get('me')
  @UseGuards(AdminSessionGuard)
  @ApiOperation({ summary: 'Current admin' })
  @ApiResponse({ status: 200, description: 'Current admin' })
  me(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return ApiRes(ADM.ME, admin);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminSessionGuard)
  @ApiOperation({ summary: 'Sign out — revokes every session of this admin' })
  @ApiResponse({ status: 200, description: 'Signed out' })
  async logout(@CurrentAdmin() admin: AuthenticatedAdmin) {
    await this.auth.logout(admin.id);
    return ApiRes(ADM.LOGGED_OUT, null);
  }
}
