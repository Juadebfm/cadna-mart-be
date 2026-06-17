import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { ParseObjectIdPipe } from '@common/pipes/parse-object-id.pipe';
import { ReviewsService } from './reviews.service';
import { ModerateReviewDto } from './dto/moderate-review.dto';

@ApiTags('Admin — Reviews')
@ApiBearerAuth()
@AccountTypes(AccountType.ADMIN)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':id/moderate')
  @ApiOperation({ summary: 'Moderate a review by approving or hiding it' })
  async moderateReview(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ModerateReviewDto,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.reviewsService.moderateReview(id, adminUserId, dto);
  }
}
