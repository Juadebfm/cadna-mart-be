import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import { Types } from 'mongoose';

export enum PartnerStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

export enum CommitmentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  ACTIVE = 'active',
  SETTLED = 'settled',
  REJECTED = 'rejected',
  DISPUTED = 'disputed',
}

@Schema({ timestamps: true, toJSON: { virtuals: true }, collection: 'partner_profiles' })
export class PartnerProfile extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: PartnerStatus, default: PartnerStatus.PENDING, index: true })
  status!: PartnerStatus;

  @Prop({ default: false })
  kycSubmitted!: boolean;

  @Prop({ default: false })
  agreementAccepted!: boolean;

  @Prop({ type: Date, default: null })
  agreementAcceptedAt!: Date | null;

  @Prop({ default: 0 })
  fundingCapNGN!: number;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;
}

export const PartnerProfileSchema = SchemaFactory.createForClass(PartnerProfile);

@Schema({ timestamps: true, toJSON: { virtuals: true }, collection: 'partner_commitments' })
export class PartnerCommitment extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'PartnerProfile', required: true, index: true })
  partnerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amountNGN!: number;

  @Prop({ type: String, enum: CommitmentStatus, default: CommitmentStatus.PENDING, index: true })
  status!: CommitmentStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;
}

export const PartnerCommitmentSchema = SchemaFactory.createForClass(PartnerCommitment);

@Schema({ timestamps: true, toJSON: { virtuals: true }, collection: 'partner_disputes' })
export class PartnerDispute extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'PartnerProfile', required: true, index: true })
  partnerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PartnerCommitment', required: true })
  commitmentId!: Types.ObjectId;

  @Prop({ required: true })
  reason!: string;

  @Prop({ type: String, enum: ['open', 'resolved', 'rejected'], default: 'open', index: true })
  status!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  resolvedBy!: Types.ObjectId | null;

  @Prop({ default: null })
  resolution!: string | null;
}

export const PartnerDisputeSchema = SchemaFactory.createForClass(PartnerDispute);
