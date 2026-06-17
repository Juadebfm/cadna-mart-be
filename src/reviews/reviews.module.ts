import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Review, ReviewSchema } from './schemas/review.schema';
import { Product, ProductSchema } from '@products/schemas/product.schema';
import { ReviewsRepository } from './reviews.repository';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { UserReviewsController } from './user-reviews.controller';
import { AdminReviewsController } from './admin-reviews.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [ReviewsController, UserReviewsController, AdminReviewsController],
  providers: [ReviewsRepository, ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
