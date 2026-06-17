import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  RefundMethod,
  RefundStatus,
  ReturnRequest,
  ReturnStatus,
} from './schemas/return-request.schema';
import { ReturnsRepository } from './returns.repository';
import { CreateReturnDto } from './dto/create-return.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';

@Injectable()
export class ReturnsService {
  constructor(private readonly repo: ReturnsRepository) {}

  private toDto(r: ReturnRequest): object {
    const id = (r as unknown as { _id: { toString(): string } })._id.toString();
    return {
      id,
      userId: r.userId,
      orderId: r.orderId,
      orderRef: r.orderRef,
      orderItemProductId: r.orderItemProductId,
      orderItemVariantId: r.orderItemVariantId,
      orderItemName: r.orderItemName,
      quantity: r.quantity,
      reason: r.reason,
      description: r.description,
      evidenceUrls: r.evidenceUrls,
      status: r.status,
      sellerDecision: r.sellerDecision,
      sellerDecisionNote: r.sellerDecisionNote,
      sellerDecidedAt: r.sellerDecidedAt,
      adminOverrideNote: r.adminOverrideNote,
      refundStatus: r.refundStatus,
      refundMethod: r.refundMethod,
      refundAmount: r.refundAmount,
      refundReference: r.refundReference,
      refundProcessedAt: r.refundProcessedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async create(userId: string, dto: CreateReturnDto): Promise<object> {
    const data: Partial<ReturnRequest> = {
      userId: new Types.ObjectId(userId) as unknown as ReturnRequest['userId'],
      orderId: new Types.ObjectId(dto.orderId) as unknown as ReturnRequest['orderId'],
      orderRef: '',
      orderItemProductId: dto.orderItemProductId,
      orderItemVariantId: dto.orderItemVariantId ?? null,
      orderItemName: dto.orderItemName,
      quantity: dto.quantity,
      reason: dto.reason,
      description: dto.description ?? null,
      evidenceUrls: [],
      status: ReturnStatus.PENDING,
    };

    const created = await this.repo.create(data);
    return this.toDto(created);
  }

  async findByUser(userId: string, page = 1, limit = 20): Promise<object> {
    const { items, totalItems } = await this.repo.findByUserId(userId, page, limit);
    return {
      items: items.map((r) => this.toDto(r)),
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    };
  }

  async findById(id: string, userId?: string): Promise<object> {
    const r = await this.repo.findById(id);
    if (!r) throw new NotFoundException('Return request not found');
    if (userId && r.userId.toString() !== userId) throw new ForbiddenException('Access denied');
    return this.toDto(r);
  }

  async cancel(id: string, userId: string): Promise<object> {
    const r = await this.repo.findById(id);
    if (!r) throw new NotFoundException('Return request not found');
    if (r.userId.toString() !== userId) throw new ForbiddenException('Access denied');
    if (r.status !== ReturnStatus.PENDING) {
      throw new BadRequestException('Only pending return requests can be cancelled');
    }
    const updated = await this.repo.update(id, {
      status: ReturnStatus.CANCELLED,
    } as Partial<ReturnRequest>);
    if (!updated) throw new NotFoundException('Return request not found after update');
    return this.toDto(updated);
  }

  async addEvidence(id: string, userId: string, urls: string[]): Promise<object> {
    const r = await this.repo.findById(id);
    if (!r) throw new NotFoundException('Return request not found');
    if (r.userId.toString() !== userId) throw new ForbiddenException('Access denied');
    if (r.status !== ReturnStatus.PENDING) {
      throw new BadRequestException('Evidence can only be added to pending return requests');
    }
    const existing = r.evidenceUrls ?? [];
    const updated = await this.repo.update(id, {
      evidenceUrls: [...existing, ...urls],
    } as Partial<ReturnRequest>);
    if (!updated) throw new NotFoundException('Return request not found after update');
    return this.toDto(updated);
  }

  checkEligibility(orderItemId: string): object {
    return {
      orderItemId,
      eligible: true,
      windowDays: 7,
      note: 'Return eligibility window is 7 days from delivery. Supplier-specific overrides apply.',
    };
  }

  async processRefund(returnId: string, dto: ProcessRefundDto, adminId: string): Promise<object> {
    const r = await this.repo.findById(returnId);
    if (!r) throw new NotFoundException('Return request not found');
    if (![ReturnStatus.APPROVED, ReturnStatus.PENDING].includes(r.status)) {
      throw new BadRequestException(
        'Return must be approved or pending before refund can be processed',
      );
    }
    const updated = await this.repo.update(returnId, {
      status: ReturnStatus.COMPLETED,
      refundStatus: RefundStatus.PROCESSING,
      refundMethod: dto.refundMethod,
      refundAmount: dto.refundAmount,
      adminOverrideNote: dto.note ?? null,
      adminOverrideBy: new Types.ObjectId(adminId) as unknown as ReturnRequest['adminOverrideBy'],
      refundProcessedAt: new Date(),
    } as Partial<ReturnRequest>);
    if (!updated) throw new NotFoundException('Return request not found after update');
    return this.toDto(updated);
  }

  async getRefundStatus(id: string): Promise<object> {
    const r = await this.repo.findById(id);
    if (!r) throw new NotFoundException('Return / refund not found');
    return {
      returnId: id,
      refundStatus: r.refundStatus,
      refundMethod: r.refundMethod,
      refundAmount: r.refundAmount,
      refundReference: r.refundReference,
      refundProcessedAt: r.refundProcessedAt,
    };
  }

  async findAll(page = 1, limit = 20, status?: ReturnStatus): Promise<object> {
    const { items, totalItems } = await this.repo.findAll(page, limit, status);
    return {
      items: items.map((r) => this.toDto(r)),
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    };
  }

  async adminDecision(
    id: string,
    decision: 'approve' | 'reject',
    note: string | undefined,
    adminId: string,
  ): Promise<object> {
    const r = await this.repo.findById(id);
    if (!r) throw new NotFoundException('Return request not found');
    const status = decision === 'approve' ? ReturnStatus.APPROVED : ReturnStatus.REJECTED;
    const updated = await this.repo.update(id, {
      status,
      adminOverrideNote: note ?? null,
      adminOverrideBy: new Types.ObjectId(adminId) as unknown as ReturnRequest['adminOverrideBy'],
    } as Partial<ReturnRequest>);
    if (!updated) throw new NotFoundException('Return request not found after update');
    return this.toDto(updated);
  }

  async sellerDecision(
    id: string,
    decision: 'approve' | 'reject',
    note: string | undefined,
    sellerProductIds: string[],
  ): Promise<object> {
    const r = await this.repo.findById(id);
    if (!r) throw new NotFoundException('Return request not found');
    if (!sellerProductIds.includes(r.orderItemProductId)) {
      throw new ForbiddenException('This return is not for one of your products');
    }
    if (r.status !== ReturnStatus.PENDING) {
      throw new BadRequestException('Decision can only be set on pending returns');
    }
    const status = decision === 'approve' ? ReturnStatus.APPROVED : ReturnStatus.REJECTED;
    const updated = await this.repo.update(id, {
      status,
      sellerDecision: decision,
      sellerDecisionNote: note ?? null,
      sellerDecidedAt: new Date(),
    } as Partial<ReturnRequest>);
    if (!updated) throw new NotFoundException('Return request not found after update');
    return this.toDto(updated);
  }

  async findBySeller(productIds: string[], page = 1, limit = 20): Promise<object> {
    const { items, totalItems } = await this.repo.findAllBySeller(productIds, page, limit);
    return {
      items: items.map((r) => this.toDto(r)),
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    };
  }

  formatMoney(amount: number): object {
    return { amount, currency: 'NGN', formatted: '₦' + Math.round(amount).toLocaleString('en-NG') };
  }

  buildRefundList(items: ReturnRequest[]): object[] {
    return items
      .filter((r) => r.refundStatus !== null)
      .map((r) => {
        const id = (r as unknown as { _id: { toString(): string } })._id.toString();
        return {
          refundId: id,
          returnId: id,
          refundStatus: r.refundStatus,
          refundMethod: r.refundMethod as RefundMethod,
          refundAmount: this.formatMoney(r.refundAmount),
          refundReference: r.refundReference,
          refundProcessedAt: r.refundProcessedAt,
        };
      });
  }
}
