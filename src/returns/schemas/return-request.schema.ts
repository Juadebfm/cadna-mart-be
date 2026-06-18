import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import { Types } from 'mongoose';

export enum ReturnStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum ReturnReason {
  DEFECTIVE = 'defective',
  NOT_AS_DESCRIBED = 'not_as_described',
  WRONG_ITEM = 'wrong_item',
  DAMAGED_IN_TRANSIT = 'damaged_in_transit',
  CHANGED_MIND = 'changed_mind',
  OTHER = 'other',
}

export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum RefundMethod {
  ORIGINAL_PAYMENT = 'original_payment',
  WALLET = 'wallet',
  BANK_TRANSFER = 'bank_transfer',
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  collection: 'return_requests',
})
export class ReturnRequest extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
  orderId!: Types.ObjectId;

  @Prop({ required: true })
  orderRef!: string;

  @Prop({ required: true })
  orderItemProductId!: string;

  @Prop({ type: String, default: null })
  orderItemVariantId!: string | null;

  @Prop({ required: true })
  orderItemName!: string;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ type: String, enum: ReturnReason, required: true })
  reason!: ReturnReason;

  @Prop({ type: String, default: null })
  description!: string | null;

  @Prop({ type: [String], default: [] })
  evidenceUrls!: string[];

  @Prop({ type: String, enum: ReturnStatus, default: ReturnStatus.PENDING, index: true })
  status!: ReturnStatus;

  @Prop({ type: String, default: null })
  sellerDecision!: string | null;

  @Prop({ type: String, default: null })
  sellerDecisionNote!: string | null;

  @Prop({ type: Date, default: null })
  sellerDecidedAt!: Date | null;

  @Prop({ type: String, default: null })
  adminOverrideNote!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  adminOverrideBy!: Types.ObjectId | null;

  @Prop({ type: String, enum: RefundStatus, default: null })
  refundStatus!: RefundStatus | null;

  @Prop({ type: String, enum: RefundMethod, default: null })
  refundMethod!: RefundMethod | null;

  @Prop({ type: String, default: null })
  refundReference!: string | null;

  @Prop({ type: Date, default: null })
  refundProcessedAt!: Date | null;

  @Prop({ default: 0 })
  refundAmount!: number;
}

export const ReturnRequestSchema = SchemaFactory.createForClass(ReturnRequest);

ReturnRequestSchema.index({ userId: 1, createdAt: -1 });
ReturnRequestSchema.index({ orderId: 1 });
ReturnRequestSchema.index({ status: 1 });
