import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Order, OrderStatus, OrderTimelineEntry } from './schemas/order.schema';

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
    page: number,
    limit: number,
  ): Promise<{ items: Order[]; totalItems: number }> {
    const filter: FilterQuery<Order> = { userId, deletedAt: null };
    const skip = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
      this.orderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    return { items: items as unknown as Order[], totalItems };
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

  async update(id: string, data: Partial<Order>): Promise<Order | null> {
    return this.orderModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean()
      .exec() as unknown as Promise<Order | null>;
  }
}
