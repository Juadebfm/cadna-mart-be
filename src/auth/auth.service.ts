import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { ConfigService } from '@config/config.service';
import { UsersService } from '@users/users.service';
import { OtpService } from '@otp/otp.service';
import { OtpType } from '@otp/enums/otp-type.enum';
import { EmailService } from '@email/email.service';
import { RegistrationSessionService } from '@registration-session/registration-session.service';
import { SellerProfile } from '@sellers/schemas/seller-profile.schema';
import { JwtPayload, TokenResponse } from './interfaces/jwt-payload.interface';
import { comparePassword, hashPassword } from '@common/utils/hash.util';
import { ERROR_MESSAGES } from '@common/constants/error-messages.constants';
import { validatePasswordStrength } from '@common/validators/password-strength.validator';
import { AccountType } from '@users/enums/account-type.enum';
import { AuthProvider } from '@users/enums/auth-provider.enum';
import { OtpPurpose } from './dto/otp.dto';
import { AuthEventsService } from '@auth-events/auth-events.service';
import { AuthEventKind } from '@auth-events/schemas/auth-event.schema';

type OtpVerifyResult =
  | { purpose: OtpPurpose.LOGIN; tokens: TokenResponse; user: object }
  | { purpose: OtpPurpose.EMAIL_VERIFICATION; message: string }
  | { purpose: OtpPurpose.PASSWORD_RESET; resetToken: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly registrationSessionService: RegistrationSessionService,
    private readonly authEventsService: AuthEventsService,
    @InjectModel(SellerProfile.name) private readonly sellerProfileModel: Model<SellerProfile>,
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

  async registerPassword(
    sessionId: string,
    password: string,
    confirmPassword: string,
  ): Promise<{ message: string }> {
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const session = await this.registrationSessionService.validateStep(sessionId, 2);

    validatePasswordStrength(password, {
      firstName: session.firstName ?? undefined,
      lastName: session.lastName ?? undefined,
      email: session.email,
    });

    // Create the user (isVerified: false) — usersService.create() handles hashing
    await this.usersService.create({
      email: session.email,
      password,
      firstName: session.firstName!,
      lastName: session.lastName!,
      accountType: AccountType.BUYER,
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

    const userId = (user as unknown as { _id: { toString(): string } })._id.toString();
    await this.usersService.verifyUser(userId);
    await this.authEventsService.log(userId, AuthEventKind.REGISTER);

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

  // ─── SELLER REGISTRATION ───────────────────────────────────

  async registerSellerEmail(email: string): Promise<{ sessionId: string }> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.USER_ALREADY_EXISTS);
    }

    const session = await this.registrationSessionService.createSession(email);
    return { sessionId: session.sessionId };
  }

  async registerSellerDetails(
    sessionId: string,
    details: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      phoneNumber?: string;
      businessName: string;
      businessRegistrationNumber?: string;
      businessAddress: string;
      businessType: string;
      bankName: string;
      bankAccountNumber: string;
      bankAccountName: string;
      termsAccepted: boolean;
    },
  ): Promise<{ sessionId: string }> {
    await this.registrationSessionService.setDetails(sessionId, {
      firstName: details.firstName,
      lastName: details.lastName,
      dateOfBirth: details.dateOfBirth,
      phoneNumber: details.phoneNumber,
      termsAccepted: details.termsAccepted,
    });

    // Store business details in session metadata (we'll read them back at password step)
    const session = await this.registrationSessionService.getSession(sessionId);
    (session as any).businessDetails = {
      businessName: details.businessName,
      businessRegistrationNumber: details.businessRegistrationNumber ?? null,
      businessAddress: details.businessAddress,
      businessType: details.businessType,
      bankName: details.bankName,
      bankAccountNumber: details.bankAccountNumber,
      bankAccountName: details.bankAccountName,
    };

    return { sessionId };
  }

  async registerSellerPassword(
    sessionId: string,
    password: string,
    confirmPassword: string,
    businessDetails: {
      businessName: string;
      businessRegistrationNumber?: string;
      businessAddress: string;
      businessType: string;
      bankName: string;
      bankAccountNumber: string;
      bankAccountName: string;
    },
  ): Promise<{ message: string }> {
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const session = await this.registrationSessionService.validateStep(sessionId, 2);

    validatePasswordStrength(password, {
      firstName: session.firstName ?? undefined,
      lastName: session.lastName ?? undefined,
      email: session.email,
    });

    // Create user as SELLER — usersService.create() handles hashing
    const user = await this.usersService.create({
      email: session.email,
      password,
      firstName: session.firstName!,
      lastName: session.lastName!,
      accountType: AccountType.SELLER,
      phoneNumber: session.phoneNumber ?? undefined,
      dateOfBirth: session.dateOfBirth ? session.dateOfBirth.toISOString() : undefined,
      termsAccepted: session.termsAccepted,
    });

    const userId = (user as any)._id.toString();

    // Create SellerProfile
    await this.sellerProfileModel.create({
      user: userId,
      businessName: businessDetails.businessName,
      businessRegistrationNumber: businessDetails.businessRegistrationNumber ?? null,
      businessAddress: businessDetails.businessAddress,
      businessType: businessDetails.businessType,
      bankName: businessDetails.bankName,
      bankAccountNumber: businessDetails.bankAccountNumber,
      bankAccountName: businessDetails.bankAccountName,
      isApproved: false,
    });

    // Send verification OTP
    const code = await this.otpService.generateAndStore(session.email, OtpType.EMAIL_VERIFICATION);
    await this.emailService.sendVerificationCode(session.email, code);

    // Clean up registration session
    await this.registrationSessionService.completeAndDelete(sessionId);

    return { message: 'Seller account created. Please verify your email.' };
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

    const tokens = await this.issueTokens(user);
    await this.authEventsService.log(user.userId, AuthEventKind.LOGIN);
    return tokens;
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

  // ─── GENERIC OTP (spec-aligned) ─────────────────────────────

  async requestOtp(
    email: string,
    purpose: OtpPurpose = OtpPurpose.LOGIN,
  ): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase();

    if (purpose === OtpPurpose.LOGIN) {
      const user = await this.usersService.findByEmail(normalizedEmail);
      if (!user) {
        // Do not reveal whether the user exists
        return { message: 'If an account exists, a login code has been sent' };
      }
      if (!user.isActive) {
        throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }
      if (!user.isVerified) {
        throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_VERIFIED);
      }
      const code = await this.otpService.generateAndStore(
        normalizedEmail,
        OtpType.LOGIN_2FA,
        (user as unknown as { _id: { toString(): string } })._id.toString(),
      );
      await this.emailService.sendLoginOtp(normalizedEmail, code);
      return { message: 'Login code sent' };
    }

    if (purpose === OtpPurpose.EMAIL_VERIFICATION) {
      const user = await this.usersService.findByEmail(normalizedEmail);
      if (!user) {
        throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
      }
      if (user.isVerified) {
        throw new BadRequestException('Email is already verified');
      }
      const code = await this.otpService.generateAndStore(
        normalizedEmail,
        OtpType.EMAIL_VERIFICATION,
      );
      await this.emailService.sendVerificationCode(normalizedEmail, code);
      return { message: 'Verification code sent' };
    }

    if (purpose === OtpPurpose.PASSWORD_RESET) {
      return this.forgotPassword(normalizedEmail);
    }

    throw new BadRequestException('Unsupported OTP purpose');
  }

  async verifyOtp(
    email: string,
    code: string,
    purpose: OtpPurpose = OtpPurpose.LOGIN,
  ): Promise<OtpVerifyResult> {
    const normalizedEmail = email.toLowerCase();

    if (purpose === OtpPurpose.LOGIN) {
      await this.otpService.verify(normalizedEmail, code, OtpType.LOGIN_2FA);
      const user = await this.usersService.findByEmail(normalizedEmail);
      if (!user) {
        throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }
      const userId = (user as unknown as { _id: { toString(): string } })._id.toString();
      const tokens = await this.issueTokens({
        userId,
        email: user.email,
        accountType: user.accountType,
      });
      await this.authEventsService.log(userId, AuthEventKind.LOGIN_OTP);
      const fullUser = await this.usersService.findById(userId);
      return {
        purpose: OtpPurpose.LOGIN,
        tokens,
        user: this.usersService.toPublicUser(fullUser),
      };
    }

    if (purpose === OtpPurpose.EMAIL_VERIFICATION) {
      await this.verifyEmail(normalizedEmail, code);
      return { purpose: OtpPurpose.EMAIL_VERIFICATION, message: 'Email verified successfully' };
    }

    if (purpose === OtpPurpose.PASSWORD_RESET) {
      const { resetToken } = await this.forgotPasswordVerify(normalizedEmail, code);
      return { purpose: OtpPurpose.PASSWORD_RESET, resetToken };
    }

    throw new BadRequestException('Unsupported OTP purpose');
  }

  async resendOtp(
    email: string,
    purpose: OtpPurpose = OtpPurpose.LOGIN,
  ): Promise<{ message: string }> {
    // requestOtp already enforces the OtpService cooldown, so reuse it.
    return this.requestOtp(email, purpose);
  }

  // ─── SINGLE-CALL REGISTRATION (spec-aligned) ───────────────

  async register(dto: {
    email: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    termsAccepted: boolean;
    password: string;
    confirmPassword: string;
  }): Promise<{ message: string; email: string }> {
    const { sessionId } = await this.registerEmail(dto.email);
    await this.registerDetails(sessionId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth,
      phoneNumber: dto.phoneNumber,
      termsAccepted: dto.termsAccepted,
    });
    const { message } = await this.registerPassword(sessionId, dto.password, dto.confirmPassword);
    return { message, email: dto.email };
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

  async forgotPasswordReset(
    resetToken: string,
    password: string,
    confirmPassword: string,
  ): Promise<{ message: string }> {
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
    const userId = (user as unknown as { _id: { toString(): string } })._id.toString();
    await this.usersService.updatePassword(userId, hashedPassword);
    await this.authEventsService.log(userId, AuthEventKind.PASSWORD_RESET);

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
    await this.authEventsService.log(userId, AuthEventKind.TWO_FACTOR_ENABLE);

    return { message: 'Two-factor authentication enabled' };
  }

  async disable2fa(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user.isTwoFactorEnabled) {
      throw new BadRequestException(ERROR_MESSAGES.TWO_FACTOR_NOT_ENABLED);
    }

    await this.otpService.verify(user.email, code, OtpType.LOGIN_2FA);
    await this.usersService.setTwoFactor(userId, false);
    await this.authEventsService.log(userId, AuthEventKind.TWO_FACTOR_DISABLE);

    return { message: 'Two-factor authentication disabled' };
  }

  // ─── CLERK OAUTH LOGIN ─────────────────────────────────────

  async clerkLogin(clerkToken: string): Promise<TokenResponse & { user: object }> {
    const secretKey = this.configService.clerk.secretKey;
    if (!secretKey) {
      throw new UnauthorizedException('Clerk secret key is not configured');
    }

    const clerkClient = createClerkClient({ secretKey });

    // Verify the Clerk session token
    let clerkUser;
    try {
      const payload = await verifyToken(clerkToken, {
        secretKey,
        authorizedParties: undefined,
      });
      clerkUser = await clerkClient.users.getUser(payload.sub);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[ClerkLogin] Token verification failed:', message);
      throw new UnauthorizedException(`Invalid Clerk token: ${message}`);
    }

    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      throw new UnauthorizedException('No email associated with Clerk account');
    }

    // Just-in-time: find or create the user
    let user = await this.usersService.findByEmail(email);

    if (!user) {
      // Check if a soft-deleted user exists with this email — reactivate them
      const deletedUser = await (this.usersService as any).usersRepository.userModel
        .findOne({ email: email.toLowerCase() })
        .lean()
        .exec();

      if (deletedUser) {
        // Reactivate the soft-deleted user
        await (this.usersService as any).usersRepository.userModel.updateOne(
          { _id: deletedUser._id },
          {
            $set: {
              deletedAt: null,
              isActive: true,
              isVerified: true,
              authProvider: AuthProvider.CLERK,
              clerkId: clerkUser.id,
              firstName: clerkUser.firstName || deletedUser.firstName,
              lastName: clerkUser.lastName || deletedUser.lastName,
            },
          },
        );
        user = await this.usersService.findById(deletedUser._id.toString());
      } else {
        // First time — create user on the spot
        await this.usersService.create({
          email,
          firstName: clerkUser.firstName || 'User',
          lastName: clerkUser.lastName || '',
          password: 'CLERK_OAUTH_NO_PASSWORD',
          accountType: AccountType.BUYER,
        });

        user = await this.usersService.findByEmail(email);
        if (!user) throw new UnauthorizedException('Failed to create user');

        const userId = (user as any)._id.toString();
        await this.usersService.verifyUser(userId);
        await (this.usersService as any).usersRepository.userModel.updateOne(
          { _id: userId },
          { authProvider: AuthProvider.CLERK, clerkId: clerkUser.id },
        );

        user = await this.usersService.findById(userId);
      }
    } else if (!user.clerkId) {
      // Existing email user linking to Clerk for the first time
      const userId = (user as any)._id.toString();
      await (this.usersService as any).usersRepository.userModel.updateOne(
        { _id: userId },
        { authProvider: AuthProvider.CLERK, clerkId: clerkUser.id },
      );
      if (!user.isVerified) {
        await this.usersService.verifyUser(userId);
      }
    }

    const userId = (user as any)._id.toString();
    const tokens = await this.issueTokens({
      userId,
      email: user.email,
      accountType: user.accountType,
    });

    const fullUser = await this.usersService.findById(userId);
    await this.authEventsService.log(userId, AuthEventKind.CLERK_LOGIN);
    return {
      ...tokens,
      user: this.usersService.toPublicUser(fullUser),
    };
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
    await this.authEventsService.log(payload.sub, AuthEventKind.REFRESH);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
    await this.authEventsService.log(userId, AuthEventKind.LOGOUT);
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
