import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { NotificationsController } from './notifications.controller';
import {
  AdminNotificationsController,
  NotificationWebhooksController,
} from './admin-notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { UsersModule } from '@users/users.module';
import { EmailModule } from '@email/email.module';
import { NotificationDevice, NotificationDeviceSchema } from './schemas/notification-device.schema';
import { StackApiSmsService } from './stackapi-sms.service';
import { FirebasePushService } from './firebase-push.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationDevice.name, schema: NotificationDeviceSchema },
    ]),
    UsersModule,
    EmailModule,
  ],
  controllers: [
    NotificationsController,
    AdminNotificationsController,
    NotificationWebhooksController,
  ],
  providers: [
    NotificationsService,
    NotificationsRepository,
    StackApiSmsService,
    FirebasePushService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
