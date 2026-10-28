import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '@products/schemas/product.schema';
import { ProductsModule } from '@products/products.module';
import { RecentlyViewedController } from './recently-viewed.controller';
import { RecentlyViewedRepository } from './recently-viewed.repository';
import { RecentlyViewedService } from './recently-viewed.service';
import { RecentlyViewed, RecentlyViewedSchema } from './schemas/recently-viewed.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RecentlyViewed.name, schema: RecentlyViewedSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    ProductsModule,
  ],
  controllers: [RecentlyViewedController],
  providers: [RecentlyViewedRepository, RecentlyViewedService],
})
export class RecentlyViewedModule {}
