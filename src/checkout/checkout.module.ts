import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CheckoutSession, CheckoutSessionSchema } from './schemas/checkout-session.schema';
import { Cart, CartSchema } from '@cart/schemas/cart.schema';
import { CartRepository } from '@cart/cart.repository';
import { OrdersModule } from '../orders/orders.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CheckoutSession.name, schema: CheckoutSessionSchema },
      { name: Cart.name, schema: CartSchema },
    ]),
    OrdersModule,
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService, CartRepository],
})
export class CheckoutModule {}
