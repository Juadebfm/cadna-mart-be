import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import * as mongoose from 'mongoose';

export enum BusinessType {
  SOLE_PROPRIETOR = 'sole_proprietor',
  LLC = 'llc',
  PARTNERSHIP = 'partnership',
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
})
export class SellerProfile extends BaseSchema {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true })
  user!: mongoose.Types.ObjectId;

  @Prop({ required: true, trim: true })
  businessName!: string;

  @Prop({ type: String, default: null, trim: true })
  businessRegistrationNumber!: string | null;

  @Prop({ required: true, trim: true })
  businessAddress!: string;

  @Prop({ type: String, enum: BusinessType, required: true })
  businessType!: BusinessType;

  @Prop({ type: String, default: null, trim: true })
  bankName!: string | null;

  @Prop({ type: String, default: null, trim: true })
  bankAccountNumber!: string | null;

  @Prop({ type: String, default: null, trim: true })
  bankAccountName!: string | null;

  @Prop({ type: Date, default: null })
  bankDetailsCompletedAt!: Date | null;

  @Prop({ default: false })
  isApproved!: boolean;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
  approvedBy!: mongoose.Types.ObjectId | null;
}

export const SellerProfileSchema = SchemaFactory.createForClass(SellerProfile);

SellerProfileSchema.index({ user: 1 });
