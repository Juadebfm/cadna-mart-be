import { Controller, Post, Get, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
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

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  async login(@Req() req: Request) {
    const user = req.user as { userId: string; email: string; role: string };

    // Establish session (dual-layer auth)
    await new Promise<void>((resolve, reject) => {
      req.logIn(user, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return this.authService.login(user);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile (protected route)' })
  async getProfile(@CurrentUser('userId') userId: string) {
    return this.usersService.findById(userId);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate tokens' })
  async logout(@Req() req: Request, @CurrentUser('userId') userId: string) {
    await this.authService.logout(userId);

    // Destroy session (dual-layer auth)
    await new Promise<void>((resolve, reject) => {
      req.logout((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return { message: 'Logged out successfully' };
  }
}
