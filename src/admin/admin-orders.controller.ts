import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { OrdersService } from '@orders/orders.service';
import { ReturnsService } from '@returns/returns.service';
import { ReturnStatus } from '@returns/schemas/return-request.schema';
import {
  AdminOrderStatusDto,
  AdminOrderInterveneDto,
  AdminOrderReassignDto,
} from './dto/admin-order.dto';

@ApiTags('Admin - Orders & Ops')
@ApiBearerAuth()
@AccountTypes(AccountType.ADMIN)
@Controller('admin')
export class AdminOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly returnsService: ReturnsService,
  ) {}

  @Get('/orders')
  async listOrders(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ): Promise<object> {
    return this.ordersService.findAllAdmin(Number(page), Number(limit), status);
  }

  @Get('/orders/:id')
  async getOrder(@Param('id') id: string): Promise<object> {
    return this.ordersService.findById(id, null);
  }

  @Patch('/orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: AdminOrderStatusDto,
  ): Promise<object> {
    return this.ordersService.adminStatusTransition(id, dto.status, dto.note);
  }

  @Post('/orders/:id/intervene')
  @HttpCode(HttpStatus.OK)
  async intervene(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminOrderInterveneDto,
  ): Promise<object> {
    return {
      orderId: id,
      adminId,
      action: dto.action,
      note: dto.note ?? null,
      timestamp: new Date(),
    };
  }

  @Post('/orders/:id/reassign')
  @HttpCode(HttpStatus.OK)
  async reassign(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminOrderReassignDto,
  ): Promise<object> {
    return {
      orderId: id,
      adminId,
      sellerId: dto.sellerId ?? null,
      supplierId: dto.supplierId ?? null,
      reason: dto.reason ?? null,
      timestamp: new Date(),
    };
  }

  @Get('/returns')
  async listReturns(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ): Promise<object> {
    return this.returnsService.findAll(
      Number(page),
      Number(limit),
      status as ReturnStatus | undefined,
    );
  }

  @Post('/returns/:id/decision')
  @HttpCode(HttpStatus.OK)
  async returnDecision(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body('decision') decision: 'approve' | 'reject',
    @Body('note') note?: string,
  ): Promise<object> {
    return this.returnsService.adminDecision(id, decision, note, adminId);
  }

  @Get('/refunds')
  async listRefunds(@Query('page') page = '1', @Query('limit') limit = '20'): Promise<object> {
    const result = await this.returnsService.findAll(Number(page), Number(limit));
    return result;
  }

  @Post('/refunds/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveRefund(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body('amount') amount: number,
    @Body('note') note?: string,
  ): Promise<object> {
    return this.returnsService.processRefund(
      id,
      {
        refundMethod:
          'original_payment' as import('@returns/schemas/return-request.schema').RefundMethod,
        refundAmount: amount ?? 0,
        note,
      },
      adminId,
    );
  }
}
