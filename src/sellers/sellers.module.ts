import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Seller, SellerSchema } from './schemas/seller.schema';
import { SellerFollower, SellerFollowerSchema } from './schemas/seller-follower.schema';
import { SellerProfile, SellerProfileSchema } from './schemas/seller-profile.schema';
import { Product, ProductSchema } from '@products/schemas/product.schema';
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
  imports: [
    MongooseModule.forFeature([
      { name: Seller.name, schema: SellerSchema },
      { name: SellerFollower.name, schema: SellerFollowerSchema },
      { name: SellerProfile.name, schema: SellerProfileSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    ProductsModule,
    UsersModule,
    OtpModule,
    EmailModule,
    OrdersModule,
    ReturnsModule,
  ],
  controllers: [SellersController, SellerPostOrderController],
  providers: [SellersRepository, SellersService],
  exports: [SellersService, SellersRepository],
})
export class SellersModule {}
