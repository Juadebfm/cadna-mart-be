import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsModule } from '@products/products.module';
import { SellersModule } from '@sellers/sellers.module';
import { CategoriesModule } from '@categories/categories.module';
import { SellerProfile, SellerProfileSchema } from '@sellers/schemas/seller-profile.schema';
import { AdminProductsController } from './admin-products.controller';
import { AdminSellersController } from './admin-sellers.controller';
import { AdminCategoriesController } from './admin-categories.controller';

@Module({
  imports: [
    ProductsModule,
    SellersModule,
    CategoriesModule,
    MongooseModule.forFeature([{ name: SellerProfile.name, schema: SellerProfileSchema }]),
  ],
  controllers: [AdminProductsController, AdminSellersController, AdminCategoriesController],
})
export class AdminModule {}
