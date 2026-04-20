import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import * as mongoose from 'mongoose';

export enum DealCampaignStatus {
  DRAFT = 'draft',
  PENDING_PAYMENT = 'pending_payment',
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum DealPaymentStatus {
  UNPAID = 'unpaid',
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  collection: 'deal_campaigns',
})
export class DealCampaign extends BaseSchema {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true })
  seller!: mongoose.Types.ObjectId;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], default: [] })
  selectedProductIds!: mongoose.Types.ObjectId[];

  @Prop({ default: 10, min: 1 })
  maxProducts!: number;

  @Prop({ required: true, min: 0 })
  feeAmount!: number;

  @Prop({ default: 'NGN' })
  currency!: 'NGN';

  @Prop({ type: String, enum: DealCampaignStatus, default: DealCampaignStatus.DRAFT })
  status!: DealCampaignStatus;

  @Prop({ type: String, enum: DealPaymentStatus, default: DealPaymentStatus.UNPAID })
  paymentStatus!: DealPaymentStatus;

  @Prop({ type: String, default: null })
  paymentReference!: string | null;

  @Prop({ type: String, default: null })
  paymentAuthorizationUrl!: string | null;

  @Prop({ type: String, default: null })
  paymentAccessCode!: string | null;

  @Prop({ type: Date, default: null })
  paidAt!: Date | null;

  @Prop({ type: Date, default: null })
  startsAt!: Date | null;

  @Prop({ type: Date, default: null })
  endsAt!: Date | null;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
  approvedBy!: mongoose.Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ default: true })
  isActive!: boolean;
}

export const DealCampaignSchema = SchemaFactory.createForClass(DealCampaign);

DealCampaignSchema.index({ seller: 1, createdAt: -1 });
DealCampaignSchema.index({ status: 1, paymentStatus: 1 });
DealCampaignSchema.index({ selectedProductIds: 1 });
DealCampaignSchema.index(
  { paymentReference: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { paymentReference: { $type: 'string' } },
  },
);
