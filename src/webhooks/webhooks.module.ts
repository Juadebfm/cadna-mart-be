import { Module } from '@nestjs/common';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { UsersModule } from '@users/users.module';
import { DealsModule } from '../deals/deals.module';
import { PaystackWebhookController } from './paystack-webhook.controller';

@Module({
  imports: [UsersModule, DealsModule],
  controllers: [ClerkWebhookController, PaystackWebhookController],
})
export class WebhooksModule {}
