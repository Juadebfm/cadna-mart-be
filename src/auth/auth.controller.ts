import { Controller, Post, Get, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterEmailDto } from './dto/register-email.dto';
import { RegisterAccountTypeDto } from './dto/register-account-type.dto';
import { RegisterDetailsDto } from './dto/register-details.dto';
import { RegisterPasswordDto } from './dto/register-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto, ForgotPasswordVerifyDto, ForgotPasswordResetDto } from './dto/forgot-password.dto';
import { Verify2faLoginDto, Enable2faDto } from './dto/verify-2fa.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UsersService } from '@users/users.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // ─── MULTI-STEP REGISTRATION ─────────────────────────────────

  @Public()
  @Post('register/email')
  @ApiOperation({ summary: 'Step 1: Start registration with email' })
  async registerEmail(@Body() dto: RegisterEmailDto) {
    return this.authService.registerEmail(dto.email);
  }

  @Public()
  @Post('register/account-type')
  @ApiOperation({ summary: 'Step 2: Select account type' })
  async registerAccountType(@Body() dto: RegisterAccountTypeDto) {
    return this.authService.registerAccountType(dto.sessionId, dto.accountType);
  }

  @Public()
  @Post('register/details')
  @ApiOperation({ summary: 'Step 3: Provide personal details' })
  async registerDetails(@Body() dto: RegisterDetailsDto) {
    return this.authService.registerDetails(dto.sessionId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth,
      phoneNumber: dto.phoneNumber,
      termsAccepted: dto.termsAccepted,
    });
  }

  @Public()
  @Post('register/password')
  @ApiOperation({ summary: 'Step 4: Set password and create account' })
  async registerPassword(@Body() dto: RegisterPasswordDto) {
    return this.authService.registerPassword(dto.sessionId, dto.password, dto.confirmPassword);
  }

  @Public()
  @Post('register/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 5: Verify email with OTP code' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email, dto.code);
  }

  @Public()
  @Post('register/resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification OTP' })
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendVerificationOtp(dto.email);
  }

  // ─── LOGIN ───────────────────────────────────────────────────

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  async login(@Req() req: Request) {
    const user = req.user as { userId: string; email: string; accountType: string };

    await new Promise<void>((resolve, reject) => {
      req.logIn(user, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const result = await this.authService.login(user);

    if ('requires2FA' in result) {
      return result;
    }

    const fullUser = await this.usersService.findById(user.userId);
    return {
      ...result,
      user: this.usersService.toPublicUser(fullUser),
    };
  }

  @Public()
  @Post('login/verify-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA code during login' })
  async verifyLogin2fa(@Body() dto: Verify2faLoginDto) {
    const tokens = await this.authService.verifyLogin2fa(dto.email, dto.code);
    const user = await this.usersService.findByEmail(dto.email);
    return {
      ...tokens,
      user: user ? this.usersService.toPublicUser(user) : undefined,
    };
  }

  // ─── FORGOT PASSWORD ────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('forgot-password/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify password reset OTP' })
  async forgotPasswordVerify(@Body() dto: ForgotPasswordVerifyDto) {
    return this.authService.forgotPasswordVerify(dto.email, dto.code);
  }

  @Public()
  @Post('forgot-password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with reset token' })
  async forgotPasswordReset(@Body() dto: ForgotPasswordResetDto) {
    return this.authService.forgotPasswordReset(dto.resetToken, dto.password, dto.confirmPassword);
  }

  // ─── 2FA MANAGEMENT ─────────────────────────────────────────

  @ApiBearerAuth()
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate 2FA enable (sends OTP)' })
  async enable2fa(@CurrentUser('userId') userId: string) {
    return this.authService.initiate2faEnable(userId);
  }

  @ApiBearerAuth()
  @Post('2fa/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm 2FA enable with OTP' })
  async confirm2fa(@CurrentUser('userId') userId: string, @Body() dto: Enable2faDto) {
    return this.authService.confirm2faEnable(userId, dto.code);
  }

  @ApiBearerAuth()
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA with OTP verification' })
  async disable2fa(@CurrentUser('userId') userId: string, @Body() dto: Enable2faDto) {
    return this.authService.disable2fa(userId, dto.code);
  }

  // ─── TOKEN & PROFILE ────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('userId') userId: string) {
    const user = await this.usersService.findById(userId);
    return this.usersService.toPublicUser(user);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate tokens' })
  async logout(@Req() req: Request, @CurrentUser('userId') userId: string) {
    await this.authService.logout(userId);

    await new Promise<void>((resolve, reject) => {
      req.logout((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return { message: 'Logged out successfully' };
  }
}
