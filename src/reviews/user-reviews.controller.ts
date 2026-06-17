import { Controller, Delete, HttpCode, HttpStatus, Param, Patch, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { ParseObjectIdPipe } from '@common/pipes/parse-object-id.pipe';
import { ReviewsService } from './reviews.service';
import { UpdateReviewDto } from './dto/update-review.dto';

@ApiTags('Reviews')
@ApiBearerAuth()
@AccountTypes(AccountType.BUYER)
@Controller('reviews')
export class UserReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Edit your own review' })
  async updateReview(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.reviewsService.updateOwnReview(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete your own review' })
  async deleteReview(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.reviewsService.deleteOwnReview(id, userId);
  }
}
