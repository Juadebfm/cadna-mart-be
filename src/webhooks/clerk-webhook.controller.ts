import { Controller, Post, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { ConfigService } from '@config/config.service';
import { UsersService } from '@users/users.service';
import { AccountType } from '@users/enums/account-type.enum';
import { AuthProvider } from '@users/enums/auth-provider.enum';
import { LoggerService } from '@logger/logger.service';
import { Public } from '@auth/decorators/public.decorator';

interface ClerkUserData {
  id: string;
  email_addresses: Array<{ email_address: string }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class ClerkWebhookController {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly logger: LoggerService,
  ) {}

  @Public()
  @Post('clerk')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Clerk webhook endpoint' })
  async handleClerkWebhook(@Req() req: Request, @Res() res: Response) {
    const webhookSecret = this.configService.clerk.webhookSecret;

    if (!webhookSecret) {
      this.logger.error('CLERK_WEBHOOK_SECRET is not configured', undefined, 'ClerkWebhook');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      return res.status(400).json({ error: 'Missing svix headers' });
    }

    let event: { type: string; data: ClerkUserData };
    try {
      const wh = new Webhook(webhookSecret);
      const body = JSON.stringify(req.body);
      event = wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as typeof event;
    } catch (err) {
      this.logger.error(`Clerk webhook verification failed: ${(err as Error).message}`, undefined, 'ClerkWebhook');
      return res.status(400).json({ error: 'Webhook verification failed' });
    }

    try {
      switch (event.type) {
        case 'user.created':
          await this.handleUserCreated(event.data);
          break;
        case 'user.updated':
          await this.handleUserUpdated(event.data);
          break;
        case 'user.deleted':
          await this.handleUserDeleted(event.data);
          break;
        default:
          this.logger.debug(`Unhandled Clerk event: ${event.type}`, 'ClerkWebhook');
      }
    } catch (err) {
      this.logger.error(`Clerk webhook handler error: ${(err as Error).message}`, (err as Error).stack, 'ClerkWebhook');
      return res.status(500).json({ error: 'Webhook handler failed' });
    }

    return res.status(200).json({ received: true });
  }

  private async handleUserCreated(data: ClerkUserData): Promise<void> {
    const email = data.email_addresses?.[0]?.email_address;
    if (!email) return;

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      this.logger.warn(`Clerk user.created: user already exists for ${email}`, 'ClerkWebhook');
      return;
    }

    await this.usersService.create({
      email,
      firstName: data.first_name || 'User',
      lastName: data.last_name || '',
      password: 'CLERK_OAUTH_NO_PASSWORD',
      accountType: AccountType.BUYER,
    });

    // Update the created user with Clerk-specific fields
    const user = await this.usersService.findByEmail(email);
    if (user) {
      const userId = (user as unknown as { _id: { toString(): string } })._id.toString();
      await this.usersService.verifyUser(userId);
      // Update authProvider and clerkId directly via repository
      await (this.usersService as any).usersRepository.userModel.updateOne(
        { _id: userId },
        { authProvider: AuthProvider.CLERK, clerkId: data.id },
      );
    }

    this.logger.log(`Clerk user synced: ${email} (${data.id})`, 'ClerkWebhook');
  }

  private async handleUserUpdated(data: ClerkUserData): Promise<void> {
    const user = await this.usersService.findByClerkId(data.id);
    if (!user) return;

    const email = data.email_addresses?.[0]?.email_address;
    const userId = (user as unknown as { _id: { toString(): string } })._id.toString();

    await this.usersService.update(userId, {
      firstName: data.first_name || user.firstName,
      lastName: data.last_name || user.lastName,
    });

    this.logger.log(`Clerk user updated: ${email} (${data.id})`, 'ClerkWebhook');
  }

  private async handleUserDeleted(data: ClerkUserData): Promise<void> {
    const user = await this.usersService.findByClerkId(data.id);
    if (!user) return;

    const userId = (user as unknown as { _id: { toString(): string } })._id.toString();
    await this.usersService.remove(userId);

    this.logger.log(`Clerk user deleted: ${data.id}`, 'ClerkWebhook');
  }
}
