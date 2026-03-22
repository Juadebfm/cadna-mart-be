import { Module } from '@nestjs/common';
import { ProductsModule } from '@products/products.module';
import { SellersModule } from '@sellers/sellers.module';
import { CategoriesModule } from '@categories/categories.module';
import { AdminProductsController } from './admin-products.controller';
import { AdminSellersController } from './admin-sellers.controller';
import { AdminCategoriesController } from './admin-categories.controller';

@Module({
  imports: [ProductsModule, SellersModule, CategoriesModule],
  controllers: [AdminProductsController, AdminSellersController, AdminCategoriesController],
})
export class AdminModule {}
