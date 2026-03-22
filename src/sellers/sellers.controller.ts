import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '@auth/decorators/public.decorator';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { SellersService } from './sellers.service';
import { CreateSellerDto } from './dto/create-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { ProductsService } from '@products/products.service';
import { ProductQueryDto } from '@products/dto/product-query.dto';

@ApiTags('Sellers')
@Controller('sellers')
export class SellersController {
  constructor(
    private readonly sellersService: SellersService,
    private readonly productsService: ProductsService,
  ) {}

  @Public()
  @Get(':sellerId/summary')
  @ApiOperation({ summary: 'Get seller summary card' })
  async getSummary(@Param('sellerId') sellerId: string) {
    return this.sellersService.getSummary(sellerId);
  }

  @Public()
  @Get(':sellerSlug/products')
  @ApiOperation({ summary: 'List all products for a seller' })
  async getSellerProducts(
    @Param('sellerSlug') sellerSlug: string,
    @Query() query: ProductQueryDto,
  ) {
    return this.productsService.findBySeller(sellerSlug, query);
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.BUYER, AccountType.SELLER)
  @Post(':sellerId/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Follow a seller' })
  async follow(@Param('sellerId') sellerId: string, @CurrentUser('userId') userId: string) {
    await this.sellersService.followSeller(userId, sellerId);
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.BUYER, AccountType.SELLER)
  @Delete(':sellerId/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unfollow a seller' })
  async unfollow(@Param('sellerId') sellerId: string, @CurrentUser('userId') userId: string) {
    await this.sellersService.unfollowSeller(userId, sellerId);
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.SELLER)
  @Post()
  @ApiOperation({ summary: 'Create your seller profile (one per seller)' })
  async createSeller(@Body() dto: CreateSellerDto, @CurrentUser('userId') userId: string) {
    return this.sellersService.createSeller(dto, userId);
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.SELLER)
  @Get('my')
  @ApiOperation({ summary: 'Get your seller profile' })
  async getMySeller(@CurrentUser('userId') userId: string) {
    return this.sellersService.getMySeller(userId);
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.SELLER)
  @Patch('my')
  @ApiOperation({ summary: 'Update your seller profile' })
  async updateMySeller(
    @Body() dto: UpdateSellerDto,
    @CurrentUser() user: { userId: string; accountType: string },
  ) {
    return this.sellersService.updateMySeller(dto, user);
  }
}
