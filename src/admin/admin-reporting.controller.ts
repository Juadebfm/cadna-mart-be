import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '@orders/schemas/order.schema';

@ApiTags('Admin - Reporting')
@ApiBearerAuth()
@AccountTypes(AccountType.ADMIN)
@Controller('admin/reports')
export class AdminReportingController {
  constructor(@InjectModel(Order.name) private readonly orderModel: Model<Order>) {}

  @Get('/sales')
  async salesReport(@Query('from') from?: string, @Query('to') to?: string): Promise<object> {
    const match: Record<string, unknown> = { deletedAt: null };
    if (from || to) {
      match['createdAt'] = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }
    const [result] = await this.orderModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenueKobo: { $sum: '$pricing.total.amount' },
          },
        },
      ])
      .exec();

    return {
      period: { from: from ?? null, to: to ?? null },
      totalOrders: result?.totalOrders ?? 0,
      totalRevenue: {
        amount: result?.totalRevenueKobo ?? 0,
        currency: 'NGN',
        formatted: '₦' + Math.round(result?.totalRevenueKobo ?? 0).toLocaleString('en-NG'),
      },
    };
  }

  @Get('/gmv')
  async gmvReport(@Query('from') from?: string, @Query('to') to?: string): Promise<object> {
    const match: Record<string, unknown> = { deletedAt: null };
    if (from || to) {
      match['createdAt'] = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }
    const [result] = await this.orderModel
      .aggregate([
        { $match: match },
        { $group: { _id: null, gmv: { $sum: '$pricing.subtotal.amount' } } },
      ])
      .exec();

    return {
      period: { from: from ?? null, to: to ?? null },
      gmv: {
        amount: result?.gmv ?? 0,
        currency: 'NGN',
        formatted: '₦' + Math.round(result?.gmv ?? 0).toLocaleString('en-NG'),
      },
    };
  }

  @Get('/orders')
  async ordersReport(@Query('from') from?: string, @Query('to') to?: string): Promise<object> {
    const match: Record<string, unknown> = { deletedAt: null };
    if (from || to) {
      match['createdAt'] = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }
    const breakdown = await this.orderModel
      .aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .exec();

    return {
      period: { from: from ?? null, to: to ?? null },
      byStatus: breakdown.map((b: { _id: string; count: number }) => ({
        status: b._id,
        count: b.count,
      })),
    };
  }

  @Get('/refunds')
  async refundsReport(@Query('from') from?: string, @Query('to') to?: string): Promise<object> {
    const match: Record<string, unknown> = { deletedAt: null, paymentStatus: 'refunded' };
    if (from || to) {
      match['createdAt'] = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }
    const [result] = await this.orderModel
      .aggregate([
        { $match: match },
        {
          $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$pricing.total.amount' } },
        },
      ])
      .exec();

    return {
      period: { from: from ?? null, to: to ?? null },
      refundCount: result?.count ?? 0,
      totalRefunded: {
        amount: result?.totalAmount ?? 0,
        currency: 'NGN',
        formatted: '₦' + Math.round(result?.totalAmount ?? 0).toLocaleString('en-NG'),
      },
    };
  }

  @Get('/sellers')
  async sellersReport(): Promise<object> {
    const breakdown = await this.orderModel
      .aggregate([
        { $match: { deletedAt: null } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.sellerId',
            orderCount: { $sum: 1 },
            revenue: { $sum: '$items.lineTotal.amount' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 50 },
      ])
      .exec();

    return {
      topSellers: breakdown.map((b: { _id: string; orderCount: number; revenue: number }) => ({
        sellerId: b._id,
        orderCount: b.orderCount,
        revenue: {
          amount: b.revenue,
          currency: 'NGN',
          formatted: '₦' + Math.round(b.revenue).toLocaleString('en-NG'),
        },
      })),
    };
  }

  @Get('/products')
  async productsReport(): Promise<object> {
    const breakdown = await this.orderModel
      .aggregate([
        { $match: { deletedAt: null } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            name: { $first: '$items.name' },
            unitsSold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.lineTotal.amount' },
          },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 50 },
      ])
      .exec();

    return {
      topProducts: breakdown.map(
        (b: { _id: string; name: string; unitsSold: number; revenue: number }) => ({
          productId: b._id,
          name: b.name,
          unitsSold: b.unitsSold,
          revenue: {
            amount: b.revenue,
            currency: 'NGN',
            formatted: '₦' + Math.round(b.revenue).toLocaleString('en-NG'),
          },
        }),
      ),
    };
  }

  @Get('/delivery')
  async deliveryReport(): Promise<object> {
    const breakdown = await this.orderModel
      .aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$deliveryMode', count: { $sum: 1 } } },
      ])
      .exec();

    return {
      byMode: breakdown.map((b: { _id: string; count: number }) => ({
        mode: b._id,
        count: b.count,
      })),
      note: 'Logistics provider performance metrics will populate once provider integrations are live.',
    };
  }

  @Get('/export')
  exportReport(@Query('type') type = 'sales', @Query('format') format = 'csv'): object {
    return {
      message: `Export of ${type} report in ${format.toUpperCase()} format is queued.`,
      downloadUrl: null,
      note: 'Async CSV/XLSX export will be implemented with a job queue. For now, use the individual report endpoints.',
    };
  }
}
