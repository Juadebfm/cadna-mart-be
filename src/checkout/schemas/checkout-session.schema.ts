import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import { Types } from 'mongoose';

export enum CheckoutSessionStatus {
  INITIATED = 'initiated',
  ADDRESS_SET = 'address_set',
  DELIVERY_SET = 'delivery_set',
  SUMMARY_READY = 'summary_ready',
  CONFIRMED = 'confirmed',
  EXPIRED = 'expired',
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  collection: 'checkout_sessions',
})
export class CheckoutSession extends BaseSchema {
  @Prop({ type: String, required: true, unique: true, index: true })
  sessionId!: string;

  @Prop({ type: String, required: true })
  cartId!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId!: Types.ObjectId | null;

  @Prop({ type: String, enum: CheckoutSessionStatus, default: CheckoutSessionStatus.INITIATED })
  status!: CheckoutSessionStatus;

  @Prop({ type: Object, default: null })
  deliveryAddress!: object | null;

  @Prop({ type: Boolean, default: false })
  addressValidated!: boolean;

  @Prop({ type: String, default: null })
  deliveryMode!: string | null;

  @Prop({ type: Object, default: null })
  pickupDetails!: object | null;

  @Prop({ type: Object, default: null })
  pricingSnapshot!: object | null;

  @Prop({ type: Boolean, default: false })
  pricingLocked!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Order', default: null })
  orderId!: Types.ObjectId | null;

  @Prop({ type: Object, default: null })
  metadata!: object | null;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;
}

export const CheckoutSessionSchema = SchemaFactory.createForClass(CheckoutSession);

CheckoutSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
