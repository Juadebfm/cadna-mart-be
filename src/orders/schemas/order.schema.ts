import { BaseSchema } from '@shared/base/base.schema';
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
  notes?: string | null;
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
export interface ReturnQuantityReservation {
  requestId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
}
export class Order extends BaseSchema {
  orderRef!: string;
  userId!: string | null;
  guestEmail!: string | null;
  guestPhone!: string | null;
  items!: OrderItemSnapshot[];
  deliveryAddress!: DeliveryAddressSnapshot;
  deliveryMode!: DeliveryMode;
  pickupDetails!: PickupDetailsSnapshot | null;
  pricing!: OrderPricing;
  status!: OrderStatus;
  paymentStatus!: OrderPaymentStatus;
  paymentMethod!: OrderPaymentMethod | null;
  paystackReference!: string | null;
  refundedAmount!: number;
  reservedRefundAmount!: number;
  returnQuantityReservations!: ReturnQuantityReservation[];
  refundInProgressRequestId!: string | null;
  timeline!: OrderTimelineEntry[];
  tracking!: OrderTrackingEvent[];
  cancelReason!: string | null;
  cancelledAt!: Date | null;
  cartRef!: string | null;
}
