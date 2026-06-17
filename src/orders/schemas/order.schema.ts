import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import { Types } from 'mongoose';

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUND_REQUESTED = 'refund_requested',
  REFUNDED = 'refunded',
}

export enum OrderPaymentStatus {
  UNPAID = 'unpaid',
  AWAITING_VERIFICATION = 'awaiting_verification',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum OrderPaymentMethod {
  PAYSTACK = 'paystack',
  BANK_TRANSFER = 'bank_transfer',
  PAY_ON_DELIVERY = 'pay_on_delivery',
}

export enum DeliveryMode {
  STANDARD = 'standard',
  EXPRESS = 'express',
  PICKUP = 'pickup',
}

export interface MoneySnapshot {
  amount: number;
  currency: string;
  formatted: string;
}

export interface OrderItemSnapshot {
  productId: string;
  variantId: string | null;
  name: string;
  sku: string | null;
  thumbnailUrl: string | null;
  unitPrice: MoneySnapshot;
  quantity: number;
  lineTotal: MoneySnapshot;
  sellerId: string | null;
}

export interface OrderPricing {
  subtotal: MoneySnapshot;
  deliveryFee: MoneySnapshot;
  tax: MoneySnapshot;
  total: MoneySnapshot;
  currency: string;
}

export interface DeliveryAddressSnapshot {
  recipientName: string;
  phoneNumber: string;
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string | null;
}

export interface PickupDetailsSnapshot {
  contactName: string;
  contactPhone: string;
  vehicleType: string | null;
  scheduledAt: Date | null;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  timestamp: Date;
  note: string | null;
}

export interface OrderTrackingEvent {
  event: string;
  timestamp: Date;
  location: string | null;
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  collection: 'orders',
})
export class Order extends BaseSchema {
  @Prop({ required: true, unique: true, index: true })
  orderRef!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  userId!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  guestEmail!: string | null;

  @Prop({ type: String, default: null })
  guestPhone!: string | null;

  @Prop({ type: [Object], default: [] })
  items!: OrderItemSnapshot[];

  @Prop({ type: Object })
  deliveryAddress!: DeliveryAddressSnapshot;

  @Prop({ type: String, enum: DeliveryMode, default: DeliveryMode.STANDARD })
  deliveryMode!: DeliveryMode;

  @Prop({ type: Object, default: null })
  pickupDetails!: PickupDetailsSnapshot | null;

  @Prop({ type: Object })
  pricing!: OrderPricing;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING_PAYMENT, index: true })
  status!: OrderStatus;

  @Prop({ type: String, enum: OrderPaymentStatus, default: OrderPaymentStatus.UNPAID })
  paymentStatus!: OrderPaymentStatus;

  @Prop({ type: String, enum: OrderPaymentMethod, default: null })
  paymentMethod!: OrderPaymentMethod | null;

  @Prop({ type: String, default: null })
  paystackReference!: string | null;

  @Prop({ type: [Object], default: [] })
  timeline!: OrderTimelineEntry[];

  @Prop({ type: [Object], default: [] })
  tracking!: OrderTrackingEvent[];

  @Prop({ type: String, default: null })
  cancelReason!: string | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  @Prop({ type: String, default: null })
  cartRef!: string | null;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ guestPhone: 1 });
OrderSchema.index(
  { paystackReference: 1 },
  {
    sparse: true,
    partialFilterExpression: { paystackReference: { $type: 'string' } },
  },
);
