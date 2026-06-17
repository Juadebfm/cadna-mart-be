import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '@auth/decorators/public.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { OrdersService } from './orders.service';
import { OrderQueryDto } from './dto/order-query.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post('/')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  createOrder(): object {
    return { message: 'Use POST /checkout/{sessionId}/confirm to place an order' };
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER)
  @Get('/')
  async findMyOrders(
    @CurrentUser('id') userId: string,
    @Query() query: OrderQueryDto,
  ): Promise<object> {
    return this.ordersService.findByUser(userId, query);
  }

  @Public()
  @Get('/guest/lookup')
  async guestLookup(
    @Query('orderId') orderId: string,
    @Query('phone') phone: string,
  ): Promise<object> {
    return this.ordersService.findByGuestLookup(orderId, phone);
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER)
  @Get('/:id')
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string): Promise<object> {
    return this.ordersService.findById(id, userId);
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER)
  @Get('/:id/timeline')
  async getTimeline(@Param('id') id: string, @CurrentUser('id') userId: string): Promise<object> {
    return this.ordersService.getTimeline(id, userId);
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER)
  @Get('/:id/tracking')
  async getTracking(@Param('id') id: string, @CurrentUser('id') userId: string): Promise<object> {
    return this.ordersService.getTracking(id, userId);
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER)
  @Get('/:id/invoice')
  async getInvoice(@Param('id') id: string, @CurrentUser('id') userId: string): Promise<object> {
    return this.ordersService.getInvoice(id, userId);
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER)
  @Get('/:id/pod')
  async getPod(@Param('id') id: string, @CurrentUser('id') userId: string): Promise<object> {
    return this.ordersService.getPod(id, userId);
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER)
  @Post('/:id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CancelOrderDto,
  ): Promise<object> {
    return this.ordersService.cancel(id, userId, dto.reason);
  }
}
