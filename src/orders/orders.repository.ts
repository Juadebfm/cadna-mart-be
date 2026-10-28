import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Order, OrderPaymentStatus, OrderStatus, OrderTimelineEntry } from './schemas/order.schema';
import { OrderQueryDto } from './dto/order-query.dto';

@Injectable()
export class OrdersRepository {
  constructor(@InjectModel(Order.name) public readonly orderModel: Model<Order>) {}

  async create(data: Partial<Order>): Promise<Order> {
    const order = new this.orderModel(data);
    return order.save() as unknown as Order;
  }

  async findById(id: string): Promise<Order | null> {
    return this.orderModel
      .findOne({ _id: id, deletedAt: null })
      .lean()
      .exec() as unknown as Promise<Order | null>;
  }

  async findByOrderRef(ref: string): Promise<Order | null> {
    return this.orderModel
      .findOne({ orderRef: ref, deletedAt: null })
      .lean()
      .exec() as unknown as Promise<Order | null>;
  }

  async findByUserId(
    userId: string,
    query: OrderQueryDto,
  ): Promise<{ items: Order[]; totalItems: number }> {
    const filter = this.buildBuyerFilter(userId, query);
    const skip = (query.page - 1) * query.limit;

    const [items, totalItems] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean()
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    return { items: items as unknown as Order[], totalItems };
  }

  async findAllByUserId(userId: string, query: OrderQueryDto): Promise<Order[]> {
    return this.orderModel
      .find(this.buildBuyerFilter(userId, query))
      .sort({ createdAt: -1 })
      .lean()
      .exec() as unknown as Promise<Order[]>;
  }

  async updateBuyerDeliveryAddress(
    userId: string,
    orderId: string,
    deliveryAddress: Order['deliveryAddress'],
  ): Promise<Order | null> {
    return this.orderModel
      .findOneAndUpdate(
        {
          _id: orderId,
          userId,
          deletedAt: null,
          status: {
            $nin: [
              OrderStatus.SHIPPED,
              OrderStatus.DELIVERED,
              OrderStatus.CANCELLED,
              OrderStatus.REFUNDED,
            ],
          },
        },
        { $set: { deliveryAddress } },
        { new: true },
      )
      .lean()
      .exec() as unknown as Promise<Order | null>;
  }

  async cancelByBuyer(userId: string, orderId: string, reason?: string): Promise<Order | null> {
    const timestamp = new Date();
    return this.orderModel
      .findOneAndUpdate(
        {
          _id: orderId,
          userId,
          deletedAt: null,
          status: OrderStatus.PENDING_PAYMENT,
          paymentStatus: OrderPaymentStatus.UNPAID,
        },
        {
          $set: {
            status: OrderStatus.CANCELLED,
            cancelledAt: timestamp,
            cancelReason: reason ?? null,
          },
          $push: {
            timeline: {
              status: OrderStatus.CANCELLED,
              timestamp,
              note: reason ?? 'Cancelled by buyer',
            },
          },
        },
        { new: true },
      )
      .lean()
      .exec() as unknown as Promise<Order | null>;
  }

  private buildBuyerFilter(userId: string, query: OrderQueryDto): FilterQuery<Order> {
    const filter: FilterQuery<Order> = { userId, deletedAt: null };
    if (query.status) filter.status = query.status;
    if (query.from || query.to) {
      filter.createdAt = {
        ...(query.from ? { $gte: new Date(query.from) } : {}),
        ...(query.to ? { $lte: new Date(query.to) } : {}),
      } as never;
    }
    const search = query.search?.trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(escaped, 'i');
      filter.$or = [{ orderRef: pattern }, { 'items.name': pattern }];
    }
    return filter;
  }

  async findByPaystackReference(reference: string): Promise<Order | null> {
    return this.orderModel
      .findOne({ paystackReference: reference, deletedAt: null })
      .lean()
      .exec() as unknown as Promise<Order | null>;
  }

  async findByGuestLookup(orderId: string, guestPhone: string): Promise<Order | null> {
    return this.orderModel
      .findOne({ _id: orderId, guestPhone, deletedAt: null })
      .lean()
      .exec() as unknown as Promise<Order | null>;
  }

  async updateStatus(id: string, status: OrderStatus, note?: string): Promise<Order | null> {
    const entry: OrderTimelineEntry = {
      status,
      timestamp: new Date(),
      note: note ?? null,
    };

    const updatePayload: Record<string, unknown> = {
      status,
      $push: { timeline: entry },
    };

    if (status === OrderStatus.CANCELLED) {
      updatePayload['cancelledAt'] = new Date();
    }

    return this.orderModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .lean()
      .exec() as unknown as Promise<Order | null>;
  }

  async transitionStatusIfCurrent(
    id: string,
    allowedStatuses: OrderStatus[],
    status: OrderStatus,
    note?: string,
  ): Promise<Order | null> {
    const entry: OrderTimelineEntry = { status, timestamp: new Date(), note: note ?? null };
    return this.orderModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null, status: { $in: allowedStatuses } },
        { $set: { status }, $push: { timeline: entry } },
        { new: true },
      )
      .lean()
      .exec() as unknown as Promise<Order | null>;
  }

  async reserveReturnQuantity(
    orderId: string,
    requestId: string,
    productId: string,
    variantId: string | null,
    quantity: number,
    purchasedQuantity: number,
  ): Promise<boolean> {
    const matchingReservations = {
      $filter: {
        input: { $ifNull: ['$returnQuantityReservations', []] },
        as: 'reservation',
        cond: {
          $and: [
            { $eq: ['$$reservation.productId', productId] },
            { $eq: [{ $ifNull: ['$$reservation.variantId', null] }, variantId] },
          ],
        },
      },
    };
    const reserved = await this.orderModel
      .findOneAndUpdate(
        {
          _id: orderId,
          deletedAt: null,
          $expr: {
            $lte: [
              {
                $add: [
                  {
                    $sum: {
                      $map: {
                        input: matchingReservations,
                        as: 'reservation',
                        in: '$$reservation.quantity',
                      },
                    },
                  },
                  quantity,
                ],
              },
              purchasedQuantity,
            ],
          },
        },
        {
          $push: {
            returnQuantityReservations: {
              requestId: new Types.ObjectId(requestId),
              productId,
              variantId,
              quantity,
            },
          },
        },
        { new: true },
      )
      .lean()
      .exec();
    return Boolean(reserved);
  }

  async releaseReturnQuantity(orderId: string, requestId: string): Promise<void> {
    await this.orderModel
      .updateOne(
        { _id: orderId },
        { $pull: { returnQuantityReservations: { requestId: new Types.ObjectId(requestId) } } },
      )
      .exec();
  }

  async update(id: string, data: Partial<Order>): Promise<Order | null> {
    return this.orderModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean()
      .exec() as unknown as Promise<Order | null>;
  }

  async reserveRefund(orderId: string, requestId: string, amount: number): Promise<boolean> {
    const reserved = await this.orderModel
      .findOneAndUpdate(
        {
          _id: orderId,
          deletedAt: null,
          paymentStatus: OrderPaymentStatus.PAID,
          refundInProgressRequestId: null,
          $expr: {
            $lte: [
              {
                $add: [
                  { $ifNull: ['$refundedAmount', 0] },
                  { $ifNull: ['$reservedRefundAmount', 0] },
                  amount,
                ],
              },
              '$pricing.total.amount',
            ],
          },
        },
        { $set: { refundInProgressRequestId: requestId }, $inc: { reservedRefundAmount: amount } },
        { new: true },
      )
      .lean()
      .exec();
    return Boolean(reserved);
  }

  async finishRefundReservation(
    orderId: string,
    requestId: string,
    amount: number,
    processed: boolean,
  ): Promise<void> {
    await this.orderModel
      .updateOne(
        { _id: orderId, refundInProgressRequestId: requestId },
        {
          $set: { refundInProgressRequestId: null },
          $inc: {
            reservedRefundAmount: -amount,
            ...(processed ? { refundedAmount: amount } : {}),
          },
        },
      )
      .exec();
  }

  async findBySellerId(
    sellerId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Order[]; totalItems: number }> {
    const filter: FilterQuery<Order> = {
      'items.sellerId': sellerId,
      deletedAt: null,
    };
    const skip = (page - 1) * limit;
    const [items, totalItems] = await Promise.all([
      this.orderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);
    return { items: items as unknown as Order[], totalItems };
  }

  async findAll(
    page: number,
    limit: number,
    filters: FilterQuery<Order> = {},
  ): Promise<{ items: Order[]; totalItems: number }> {
    const filter: FilterQuery<Order> = { ...filters, deletedAt: null };
    const skip = (page - 1) * limit;
    const [items, totalItems] = await Promise.all([
      this.orderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);
    return { items: items as unknown as Order[], totalItems };
  }
}
