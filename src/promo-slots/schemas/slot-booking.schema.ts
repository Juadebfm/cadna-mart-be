import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import { Types } from 'mongoose';

export enum BookingStatus {
  PENDING_PAYMENT = 'pending_payment',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
}

export enum BookingPaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  collection: 'slot_bookings',
})
export class SlotBooking extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true, index: true })
  sellerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PromoSlot', required: true })
  slotId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'DurationTier', required: true })
  durationTierId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amountPaidNGN!: number;

  @Prop({ type: String, enum: BookingStatus, default: BookingStatus.PENDING_PAYMENT, index: true })
  status!: BookingStatus;

  @Prop({ type: String, enum: BookingPaymentStatus, default: BookingPaymentStatus.UNPAID })
  paymentStatus!: BookingPaymentStatus;

  @Prop({ default: null })
  paystackReference!: string | null;

  @Prop({ default: null })
  paystackAuthUrl!: string | null;

  @Prop({ type: Date, default: null })
  activatedAt!: Date | null;

  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;

  @Prop({ default: null })
  suspendReason!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  suspendedBy!: Types.ObjectId | null;

  @Prop({ default: 0 })
  impressions!: number;

  @Prop({ default: 0 })
  clicks!: number;

  @Prop({ default: 0 })
  orders!: number;
}

export const SlotBookingSchema = SchemaFactory.createForClass(SlotBooking);
SlotBookingSchema.index({ sellerId: 1, createdAt: -1 });
SlotBookingSchema.index({ slotId: 1 });
SlotBookingSchema.index({ status: 1 });
SlotBookingSchema.index(
  { paystackReference: 1 },
  { sparse: true, partialFilterExpression: { paystackReference: { $type: 'string' } } },
);
