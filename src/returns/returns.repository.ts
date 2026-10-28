import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RefundStatus, ReturnRequest, ReturnStatus } from './schemas/return-request.schema';

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
      .exec() as unknown as Promise<ReturnRequest | null>;
  }

  async findByOrderId(orderId: string): Promise<ReturnRequest[]> {
    return this.model.find({ orderId, deletedAt: null }).lean().exec() as unknown as Promise<
      ReturnRequest[]
    >;
  }

  async findByIdAndUser(id: string, userId: string): Promise<ReturnRequest | null> {
    return this.model
      .findOne({ _id: id, userId, deletedAt: null })
      .lean()
      .exec() as unknown as Promise<ReturnRequest | null>;
  }

  async findProcessingByProviderRefund(
    paymentReference: string,
    refundReference?: string,
    refundProviderId?: string,
  ): Promise<ReturnRequest | null> {
    const providerIds: Record<string, string>[] = [];
    if (refundReference) providerIds.push({ refundReference });
    if (refundProviderId) providerIds.push({ refundProviderId });
    if (providerIds.length === 0) return null;
    return this.model
      .findOne({
        paymentReference,
        $or: providerIds,
        refundStatus: RefundStatus.PROCESSING,
        deletedAt: null,
      })
      .lean()
      .exec() as unknown as Promise<ReturnRequest | null>;
  }

  async applyFinalProviderStatus(
    id: string,
    status: RefundStatus,
    providerStatus: string,
    refundReference: string | null,
  ): Promise<ReturnRequest | null> {
    return this.model
      .findOneAndUpdate(
        { _id: id, deletedAt: null, refundStatus: RefundStatus.PROCESSING },
        {
          $set: {
            refundStatus: status,
            refundProviderStatus: providerStatus,
            refundReference,
            ...(status === RefundStatus.COMPLETED ? { status: ReturnStatus.COMPLETED } : {}),
          },
        },
        { new: true },
      )
      .lean()
      .exec() as unknown as Promise<ReturnRequest | null>;
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
        .exec() as unknown as Promise<ReturnRequest[]>,
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
        .exec() as unknown as Promise<ReturnRequest[]>,
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async findRefunds(
    page: number,
    limit: number,
  ): Promise<{ items: ReturnRequest[]; totalItems: number }> {
    const filter = { deletedAt: null, refundStatus: { $ne: null } };
    const [items, totalItems] = await Promise.all([
      this.model
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as unknown as Promise<ReturnRequest[]>,
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
      'items.sellerId': { $in: sellerProductIds },
      deletedAt: null,
    };
    const [items, totalItems] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as unknown as Promise<ReturnRequest[]>,
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async findAllBySeller(
    productIds: string[],
    page: number,
    limit: number,
  ): Promise<{ items: ReturnRequest[]; totalItems: number }> {
    const filter = { 'items.sellerId': { $in: productIds }, deletedAt: null };
    const [items, totalItems] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as unknown as Promise<ReturnRequest[]>,
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async update(id: string, data: Partial<ReturnRequest>): Promise<ReturnRequest | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec() as unknown as Promise<ReturnRequest | null>;
  }

  async startRefund(id: string, data: Partial<ReturnRequest>): Promise<ReturnRequest | null> {
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          deletedAt: null,
          status: ReturnStatus.APPROVED,
          refundStatus: { $in: [null, RefundStatus.FAILED] },
        },
        { $set: data },
        { new: true },
      )
      .lean()
      .exec() as unknown as Promise<ReturnRequest | null>;
  }

  async decideByAdmin(id: string, data: Partial<ReturnRequest>): Promise<ReturnRequest | null> {
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          deletedAt: null,
          status: { $in: [ReturnStatus.PENDING, ReturnStatus.APPROVED, ReturnStatus.REJECTED] },
          refundStatus: null,
        },
        { $set: data },
        { new: true },
      )
      .lean()
      .exec() as unknown as Promise<ReturnRequest | null>;
  }

  async cancelPending(id: string, userId: string): Promise<ReturnRequest | null> {
    return this.model
      .findOneAndUpdate(
        { _id: id, userId, deletedAt: null, status: ReturnStatus.PENDING, refundStatus: null },
        { $set: { status: ReturnStatus.CANCELLED } },
        { new: true },
      )
      .lean()
      .exec() as unknown as Promise<ReturnRequest | null>;
  }

  async decideForSeller(
    id: string,
    sellerId: string,
    decision: 'approved' | 'rejected',
    note: string | null,
  ): Promise<ReturnRequest | null> {
    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          deletedAt: null,
          status: ReturnStatus.PENDING,
          'items.sellerId': sellerId,
          'items.sellerDecision': 'pending',
        },
        {
          $set: {
            'items.$[line].sellerDecision': decision,
            'items.$[line].sellerDecisionNote': note,
            'items.$[line].sellerDecidedAt': new Date(),
          },
        },
        {
          new: true,
          arrayFilters: [{ 'line.sellerId': sellerId, 'line.sellerDecision': 'pending' }],
        },
      )
      .lean()
      .exec() as unknown as Promise<ReturnRequest | null>;
  }
}
