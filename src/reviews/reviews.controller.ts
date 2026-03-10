import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@auth/decorators/public.decorator';
import { ReviewsService } from './reviews.service';
import { ReviewSortOption } from './reviews.repository';

@ApiTags('Reviews')
@Controller('products')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get(':productId/reviews')
  @ApiOperation({ summary: 'Get product reviews with summary' })
  async findByProduct(
    @Param('productId') productId: string,
    @Query('sort') sort: ReviewSortOption = 'most_recent',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.reviewsService.findByProduct(productId, sort, +page, +limit);
  }
}
