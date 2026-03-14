import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '@auth/decorators/public.decorator';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List products with search, filter, and pagination' })
  async findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get product detail by slug' })
  async findBySlug(@Param('slug') slug: string, @Query('variantId') variantId?: string) {
    return this.productsService.findBySlug(slug, variantId);
  }

  @Public()
  @Get(':productId/related')
  @ApiOperation({ summary: 'Get related products' })
  async findRelated(@Param('productId') productId: string, @Query('limit') limit: number = 8) {
    return this.productsService.findRelated(productId, Math.min(limit, 20));
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.SELLER, AccountType.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a product (Seller or Admin)' })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: { userId: string; accountType: string },
  ) {
    return this.productsService.createProduct(dto, user);
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.SELLER, AccountType.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a product (owner Seller or Admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: { userId: string; accountType: string },
  ) {
    return this.productsService.updateProduct(id, dto, user);
  }

  @ApiBearerAuth()
  @AccountTypes(AccountType.SELLER, AccountType.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product (owner Seller or Admin)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; accountType: string },
  ) {
    await this.productsService.removeProduct(id, user);
  }
}
