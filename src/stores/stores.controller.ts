import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '@auth/decorators/public.decorator';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@ApiTags('Stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Public()
  @Get(':storeId/summary')
  @ApiOperation({ summary: 'Get store summary card' })
  async getSummary(@Param('storeId') storeId: string) {
    return this.storesService.getSummary(storeId);
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.SELLER)
  @Post()
  @ApiOperation({ summary: 'Create your store (Seller only — one store per seller)' })
  async createStore(@Body() dto: CreateStoreDto, @CurrentUser('userId') userId: string) {
    return this.storesService.createStore(dto, userId);
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.SELLER)
  @Get('my')
  @ApiOperation({ summary: 'Get your store (Seller only)' })
  async getMyStore(@CurrentUser('userId') userId: string) {
    return this.storesService.getMyStore(userId);
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.SELLER)
  @Patch('my')
  @ApiOperation({ summary: 'Update your store (Seller only)' })
  async updateMyStore(
    @Body() dto: UpdateStoreDto,
    @CurrentUser() user: { userId: string; accountType: string },
  ) {
    return this.storesService.updateMyStore(dto, user);
  }
}
