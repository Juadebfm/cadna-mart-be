import { Module } from '@nestjs/common';
import { ProductsModule } from '@products/products.module';
import { StoresModule } from '@stores/stores.module';
import { CategoriesModule } from '@categories/categories.module';
import { AdminProductsController } from './admin-products.controller';
import { AdminStoresController } from './admin-stores.controller';
import { AdminCategoriesController } from './admin-categories.controller';

@Module({
  imports: [ProductsModule, StoresModule, CategoriesModule],
  controllers: [AdminProductsController, AdminStoresController, AdminCategoriesController],
})
export class AdminModule {}
