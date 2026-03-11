import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { StoresService } from '@stores/stores.service';
import { StoresRepository } from '@stores/stores.repository';
import { UpdateStoreDto } from '@stores/dto/update-store.dto';
import { ParseObjectIdPipe } from '@common/pipes/parse-object-id.pipe';

@ApiTags('Admin — Stores')
@ApiBearerAuth()
@AccountTypes(AccountType.ADMIN)
@Controller('admin/stores')
export class AdminStoresController {
  constructor(
    private readonly storesService: StoresService,
    private readonly storesRepository: StoresRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all stores' })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    const skip = (+page - 1) * +limit;
    const [items, totalItems] = await Promise.all([
      this.storesRepository.storeModel.find({ deletedAt: null }).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean().exec(),
      this.storesRepository.storeModel.countDocuments({ deletedAt: null }),
    ]);
    return {
      items,
      pagination: { page: +page, limit: +limit, totalItems, totalPages: Math.ceil(totalItems / +limit) },
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update any store' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateStoreDto,
    @CurrentUser() user: { userId: string; accountType: string },
  ) {
    return this.storesService.updateMyStore(dto, user, id);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Toggle store verified status' })
  async toggleVerify(@Param('id', ParseObjectIdPipe) id: string, @Body('isVerified') isVerified: boolean) {
    return this.storesRepository.update(id, { isVerified } as any);
  }
}
