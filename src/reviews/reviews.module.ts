import { Module } from '@nestjs/common';
import { ReviewsRepository } from './reviews.repository';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { UserReviewsController } from './user-reviews.controller';
import { AdminReviewsController } from './admin-reviews.controller';
import { PrismaModule } from '@database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsController, UserReviewsController, AdminReviewsController],
  providers: [ReviewsRepository, ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
