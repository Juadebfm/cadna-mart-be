import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { SellersService } from '@sellers/sellers.service';
import { SellersRepository } from '@sellers/sellers.repository';
import { UpdateSellerDto } from '@sellers/dto/update-seller.dto';
import { ParseObjectIdPipe } from '@common/pipes/parse-object-id.pipe';

@ApiTags('Admin — Sellers')
@ApiBearerAuth()
@AccountTypes(AccountType.ADMIN)
@Controller('admin/sellers')
export class AdminSellersController {
  constructor(
    private readonly sellersService: SellersService,
    private readonly sellersRepository: SellersRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all sellers' })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    const skip = (+page - 1) * +limit;
    const [items, totalItems] = await Promise.all([
      this.sellersRepository.sellerModel
        .find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(+limit)
        .lean()
        .exec(),
      this.sellersRepository.sellerModel.countDocuments({ deletedAt: null }),
    ]);
    return {
      items,
      pagination: {
        page: +page,
        limit: +limit,
        totalItems,
        totalPages: Math.ceil(totalItems / +limit),
      },
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update any seller' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateSellerDto,
    @CurrentUser() user: { userId: string; accountType: string },
  ) {
    return this.sellersService.updateMySeller(dto, user, id);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Toggle seller verified status' })
  async toggleVerify(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('isVerified') isVerified: boolean,
  ) {
    return this.sellersRepository.update(id, { isVerified } as any);
  }
}
