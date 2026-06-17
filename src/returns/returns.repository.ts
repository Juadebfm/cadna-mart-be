import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReturnRequest, ReturnStatus } from './schemas/return-request.schema';

@Injectable()
export class ReturnsRepository {
  constructor(@InjectModel(ReturnRequest.name) private readonly model: Model<ReturnRequest>) {}

  async create(data: Partial<ReturnRequest>): Promise<ReturnRequest> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<ReturnRequest | null> {
    return this.model
      .findOne({ _id: new Types.ObjectId(id), deletedAt: null })
      .lean()
      .exec() as Promise<ReturnRequest | null>;
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: ReturnRequest[]; totalItems: number }> {
    const filter = { userId: new Types.ObjectId(userId), deletedAt: null };
    const [items, totalItems] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<ReturnRequest[]>,
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async findAll(
    page: number,
    limit: number,
    status?: ReturnStatus,
  ): Promise<{ items: ReturnRequest[]; totalItems: number }> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (status) filter['status'] = status;
    const [items, totalItems] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<ReturnRequest[]>,
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async findByOrderAndSeller(
    orderId: string,
    sellerProductIds: string[],
    page: number,
    limit: number,
  ): Promise<{ items: ReturnRequest[]; totalItems: number }> {
    const filter = {
      orderId: new Types.ObjectId(orderId),
      orderItemProductId: { $in: sellerProductIds },
      deletedAt: null,
    };
    const [items, totalItems] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<ReturnRequest[]>,
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async findAllBySeller(
    productIds: string[],
    page: number,
    limit: number,
  ): Promise<{ items: ReturnRequest[]; totalItems: number }> {
    const filter = { orderItemProductId: { $in: productIds }, deletedAt: null };
    const [items, totalItems] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<ReturnRequest[]>,
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async update(id: string, data: Partial<ReturnRequest>): Promise<ReturnRequest | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec() as Promise<ReturnRequest | null>;
  }
}
