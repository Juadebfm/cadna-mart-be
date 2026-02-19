import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@config/config.service';
import { UsersService } from '@users/users.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload, TokenResponse } from './interfaces/jwt-payload.interface';
import { comparePassword, hashPassword } from '@common/utils/hash.util';
import { ERROR_MESSAGES } from '@common/constants/error-messages.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<{ userId: string; email: string; role: string } | null> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return {
      userId: (user as unknown as { _id: { toString(): string } })._id.toString(),
      email: user.email,
      role: user.role,
    };
  }

  async login(user: { userId: string; email: string; role: string }): Promise<TokenResponse> {
    const payload: JwtPayload = {
      sub: user.userId,
      email: user.email,
      role: user.role as JwtPayload['role'],
    };

    const tokens = await this.generateTokens(payload);

    const hashedRefreshToken = await hashPassword(tokens.refreshToken);
    await this.usersService.updateRefreshToken(user.userId, hashedRefreshToken);
    await this.usersService.updateLastLogin(user.userId);

    return tokens;
  }

  async register(registerDto: RegisterDto): Promise<TokenResponse> {
    const user = await this.usersService.create(registerDto);

    const payload: JwtPayload = {
      sub: (user as unknown as { _id: { toString(): string } })._id.toString(),
      email: user.email,
      role: user.role,
    };

    const tokens = await this.generateTokens(payload);

    const hashedRefreshToken = await hashPassword(tokens.refreshToken);
    await this.usersService.updateRefreshToken(payload.sub, hashedRefreshToken);

    return tokens;
  }

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
      role: user.role,
    };

    const tokens = await this.generateTokens(newPayload);

    const hashedRefreshToken = await hashPassword(tokens.refreshToken);
    await this.usersService.updateRefreshToken(payload.sub, hashedRefreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
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
