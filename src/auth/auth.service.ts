import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@config/config.service';
import { UsersService } from '@users/users.service';
import { OtpService } from '@otp/otp.service';
import { OtpType } from '@otp/enums/otp-type.enum';
import { EmailService } from '@email/email.service';
import { RegistrationSessionService } from '@registration-session/registration-session.service';
import { JwtPayload, TokenResponse } from './interfaces/jwt-payload.interface';
import { comparePassword, hashPassword } from '@common/utils/hash.util';
import { ERROR_MESSAGES } from '@common/constants/error-messages.constants';
import { validatePasswordStrength } from '@common/validators/password-strength.validator';
import { AccountType } from '@users/enums/account-type.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly registrationSessionService: RegistrationSessionService,
  ) {}

  // ─── MULTI-STEP REGISTRATION ─────────────────────────────────

  async registerEmail(email: string): Promise<{ sessionId: string }> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.USER_ALREADY_EXISTS);
    }

    const session = await this.registrationSessionService.createSession(email);
    return { sessionId: session.sessionId };
  }

  async registerAccountType(sessionId: string, accountType: AccountType): Promise<{ sessionId: string }> {
    await this.registrationSessionService.setAccountType(sessionId, accountType);
    return { sessionId };
  }

  async registerDetails(
    sessionId: string,
    details: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      phoneNumber?: string;
      termsAccepted: boolean;
    },
  ): Promise<{ sessionId: string }> {
    await this.registrationSessionService.setDetails(sessionId, details);
    return { sessionId };
  }

  async registerPassword(sessionId: string, password: string, confirmPassword: string): Promise<{ message: string }> {
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const session = await this.registrationSessionService.validateStep(sessionId, 3);

    validatePasswordStrength(password, {
      firstName: session.firstName ?? undefined,
      lastName: session.lastName ?? undefined,
      email: session.email,
    });

    const hashedPassword = await hashPassword(password);

    // Create the user (isVerified: false)
    await this.usersService.create({
      email: session.email,
      password: hashedPassword,
      firstName: session.firstName!,
      lastName: session.lastName!,
      accountType: session.accountType!,
      phoneNumber: session.phoneNumber ?? undefined,
      dateOfBirth: session.dateOfBirth ? session.dateOfBirth.toISOString() : undefined,
      termsAccepted: session.termsAccepted,
    });

    // Send verification OTP
    const code = await this.otpService.generateAndStore(session.email, OtpType.EMAIL_VERIFICATION);
    await this.emailService.sendVerificationCode(session.email, code);

    // Clean up registration session
    await this.registrationSessionService.completeAndDelete(sessionId);

    return { message: 'Account created. Please verify your email.' };
  }

  async verifyEmail(email: string, code: string): Promise<{ message: string }> {
    await this.otpService.verify(email, code, OtpType.EMAIL_VERIFICATION);

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    await this.usersService.verifyUser((user as unknown as { _id: { toString(): string } })._id.toString());

    return { message: 'Email verified successfully' };
  }

  async resendVerificationOtp(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const code = await this.otpService.generateAndStore(email, OtpType.EMAIL_VERIFICATION);
    await this.emailService.sendVerificationCode(email, code);

    return { message: 'Verification code sent' };
  }

  // ─── LOGIN ───────────────────────────────────────────────────

  async validateUser(
    email: string,
    password: string,
  ): Promise<{ userId: string; email: string; accountType: string } | null> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user || !user.isActive) {
      return null;
    }

    if (!user.password) {
      return null;
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_VERIFIED);
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return {
      userId: (user as unknown as { _id: { toString(): string } })._id.toString(),
      email: user.email,
      accountType: user.accountType,
    };
  }

  async login(user: {
    userId: string;
    email: string;
    accountType: string;
  }): Promise<TokenResponse | { requires2FA: true; email: string }> {
    const fullUser = await this.usersService.findById(user.userId);

    if (fullUser.isTwoFactorEnabled) {
      const code = await this.otpService.generateAndStore(
        user.email,
        OtpType.LOGIN_2FA,
        user.userId,
      );
      await this.emailService.sendLoginOtp(user.email, code);
      return { requires2FA: true, email: user.email };
    }

    return this.issueTokens(user);
  }

  async verifyLogin2fa(email: string, code: string): Promise<TokenResponse> {
    await this.otpService.verify(email, code, OtpType.LOGIN_2FA);

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    return this.issueTokens({
      userId: (user as unknown as { _id: { toString(): string } })._id.toString(),
      email: user.email,
      accountType: user.accountType,
    });
  }

  // ─── FORGOT PASSWORD ────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal whether user exists
      return { message: 'If an account exists, a reset code has been sent' };
    }

    const code = await this.otpService.generateAndStore(
      email,
      OtpType.PASSWORD_RESET,
      (user as unknown as { _id: { toString(): string } })._id.toString(),
    );
    await this.emailService.sendPasswordResetOtp(email, code);

    return { message: 'If an account exists, a reset code has been sent' };
  }

  async forgotPasswordVerify(email: string, code: string): Promise<{ resetToken: string }> {
    await this.otpService.verify(email, code, OtpType.PASSWORD_RESET);

    // Issue a short-lived reset token
    const resetToken = await this.jwtService.signAsync(
      { email, purpose: 'password_reset' } as Record<string, unknown>,
      {
        secret: this.configService.jwt.accessSecret,
        expiresIn: '5m',
      },
    );

    return { resetToken };
  }

  async forgotPasswordReset(resetToken: string, password: string, confirmPassword: string): Promise<{ message: string }> {
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    let tokenPayload: { email: string; purpose: string };
    try {
      tokenPayload = await this.jwtService.verifyAsync(resetToken, {
        secret: this.configService.jwt.accessSecret,
      });
    } catch {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }

    if (tokenPayload.purpose !== 'password_reset') {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }

    const user = await this.usersService.findByEmail(tokenPayload.email);
    if (!user) {
      throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    validatePasswordStrength(password, {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });

    const hashedPassword = await hashPassword(password);
    await this.usersService.updatePassword(
      (user as unknown as { _id: { toString(): string } })._id.toString(),
      hashedPassword,
    );

    return { message: 'Password reset successfully' };
  }

  // ─── 2FA MANAGEMENT ─────────────────────────────────────────

  async initiate2faEnable(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (user.isTwoFactorEnabled) {
      throw new BadRequestException(ERROR_MESSAGES.TWO_FACTOR_ALREADY_ENABLED);
    }

    const code = await this.otpService.generateAndStore(user.email, OtpType.LOGIN_2FA, userId);
    await this.emailService.sendLoginOtp(user.email, code);

    return { message: 'Verification code sent to your email' };
  }

  async confirm2faEnable(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    await this.otpService.verify(user.email, code, OtpType.LOGIN_2FA);
    await this.usersService.setTwoFactor(userId, true);

    return { message: 'Two-factor authentication enabled' };
  }

  async disable2fa(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user.isTwoFactorEnabled) {
      throw new BadRequestException(ERROR_MESSAGES.TWO_FACTOR_NOT_ENABLED);
    }

    await this.otpService.verify(user.email, code, OtpType.LOGIN_2FA);
    await this.usersService.setTwoFactor(userId, false);

    return { message: 'Two-factor authentication disabled' };
  }

  // ─── TOKEN MANAGEMENT ───────────────────────────────────────

  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.jwt.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }

    let user;
    try {
      user = await this.usersService.findById(payload.sub);
    } catch {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }

    const isRefreshTokenValid = await comparePassword(refreshToken, user.refreshToken);
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }

    const newPayload: JwtPayload = {
      sub: (user as unknown as { _id: { toString(): string } })._id.toString(),
      email: user.email,
      accountType: user.accountType,
    };

    const tokens = await this.generateTokens(newPayload);

    const hashedRefreshToken = await hashPassword(tokens.refreshToken);
    await this.usersService.updateRefreshToken(payload.sub, hashedRefreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  // ─── PRIVATE HELPERS ────────────────────────────────────────

  private async issueTokens(user: {
    userId: string;
    email: string;
    accountType: string;
  }): Promise<TokenResponse> {
    const payload: JwtPayload = {
      sub: user.userId,
      email: user.email,
      accountType: user.accountType as JwtPayload['accountType'],
    };

    const tokens = await this.generateTokens(payload);

    const hashedRefreshToken = await hashPassword(tokens.refreshToken);
    await this.usersService.updateRefreshToken(user.userId, hashedRefreshToken);
    await this.usersService.updateLastLogin(user.userId);

    return tokens;
  }

  private async generateTokens(payload: JwtPayload): Promise<TokenResponse> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as unknown as Record<string, unknown>, {
        secret: this.configService.jwt.accessSecret,
        expiresIn: this.configService.jwt.accessExpiration as any,
      }),
      this.jwtService.signAsync(payload as unknown as Record<string, unknown>, {
        secret: this.configService.jwt.refreshSecret,
        expiresIn: this.configService.jwt.refreshExpiration as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.jwt.accessExpiration,
    };
  }
}
