import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { SellerProfile, SellerProfileSchema } from '@sellers/schemas/seller-profile.schema';
import { Seller, SellerSchema } from '@sellers/schemas/seller.schema';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoryProductsController } from './category-products.controller';
import { CategoriesModule } from '@categories/categories.module';
import { PoliciesModule } from '@policies/policies.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: SellerProfile.name, schema: SellerProfileSchema },
      { name: Seller.name, schema: SellerSchema },
    ]),
    CategoriesModule,
    PoliciesModule,
  ],
  controllers: [ProductsController, CategoryProductsController],
  providers: [ProductsRepository, ProductsService],
  exports: [ProductsService, ProductsRepository],
})
export class ProductsModule {}
