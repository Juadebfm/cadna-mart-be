import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { UsersModule } from '@users/users.module';
import { CartModule } from '@cart/cart.module';
import { NotificationsModule } from '@notifications/notifications.module';

@Module({
  imports: [UsersModule, CartModule, NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
