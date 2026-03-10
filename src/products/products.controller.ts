import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@auth/decorators/public.decorator';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';

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
  async findBySlug(
    @Param('slug') slug: string,
    @Query('variantId') variantId?: string,
  ) {
    return this.productsService.findBySlug(slug, variantId);
  }

  @Public()
  @Get(':productId/related')
  @ApiOperation({ summary: 'Get related products' })
  async findRelated(
    @Param('productId') productId: string,
    @Query('limit') limit: number = 8,
  ) {
    return this.productsService.findRelated(productId, Math.min(limit, 20));
  }
}
