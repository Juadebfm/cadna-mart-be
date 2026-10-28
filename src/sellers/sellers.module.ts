import { Module } from '@nestjs/common';
import { SellersRepository } from './sellers.repository';
import { SellersService } from './sellers.service';
import { SellersController } from './sellers.controller';
import { SellerPostOrderController } from './seller-post-order.controller';
import { ProductsModule } from '@products/products.module';
import { UsersModule } from '@users/users.module';
import { OtpModule } from '@otp/otp.module';
import { EmailModule } from '@email/email.module';
import { OrdersModule } from '@orders/orders.module';
import { ReturnsModule } from '@returns/returns.module';

@Module({
  imports: [ProductsModule, UsersModule, OtpModule, EmailModule, OrdersModule, ReturnsModule],
  controllers: [SellersController, SellerPostOrderController],
  providers: [SellersRepository, SellersService],
  exports: [SellersService, SellersRepository],
})
export class SellersModule {}
