import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WishlistItem, WishlistItemSchema } from './schemas/wishlist.schema';
import { WishlistRepository } from './wishlist.repository';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { ProductsModule } from '@products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WishlistItem.name, schema: WishlistItemSchema }]),
    ProductsModule,
  ],
  controllers: [WishlistController],
  providers: [WishlistRepository, WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
