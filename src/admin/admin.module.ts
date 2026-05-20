import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsModule } from '@products/products.module';
import { SellersModule } from '@sellers/sellers.module';
import { CategoriesModule } from '@categories/categories.module';
import { UsersModule } from '@users/users.module';
import { SellerProfile, SellerProfileSchema } from '@sellers/schemas/seller-profile.schema';
import { AdminProductsController } from './admin-products.controller';
import { AdminSellersController } from './admin-sellers.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  imports: [
    ProductsModule,
    SellersModule,
    CategoriesModule,
    UsersModule,
    MongooseModule.forFeature([{ name: SellerProfile.name, schema: SellerProfileSchema }]),
  ],
  controllers: [
    AdminProductsController,
    AdminSellersController,
    AdminCategoriesController,
    AdminUsersController,
  ],
})
export class AdminModule {}
