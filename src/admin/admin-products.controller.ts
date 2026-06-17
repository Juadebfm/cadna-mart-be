import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { ProductsService } from '@products/products.service';
import { ProductsRepository } from '@products/products.repository';
import { UpdateProductDto } from '@products/dto/update-product.dto';
import { ParseObjectIdPipe } from '@common/pipes/parse-object-id.pipe';

@ApiTags('Admin — Products')
@ApiBearerAuth()
@AccountTypes(AccountType.ADMIN)
@Controller('admin/products')
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productsRepository: ProductsRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all products (including inactive)' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('includeInactive') includeInactive = true,
  ) {
    const { items, totalItems } = await this.productsRepository.findAllAdmin(
      +page,
      Math.min(+limit, 100),
      Boolean(includeInactive),
    );
    const totalPages = Math.ceil(totalItems / +limit);
    return {
      items: items.map((p) => this.productsService.toCard(p)),
      pagination: { page: +page, limit: +limit, totalItems, totalPages },
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update any product' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: { userId: string; accountType: string },
  ) {
    return this.productsService.updateProduct(id, dto, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Toggle product active/inactive status' })
  async toggleStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.productsRepository.update(id, { isActive } as any);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Force delete any product' })
  async remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { userId: string; accountType: string },
  ) {
    await this.productsService.removeProduct(id, user);
  }
}
