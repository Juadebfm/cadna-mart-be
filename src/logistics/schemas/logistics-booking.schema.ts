import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import { Types } from 'mongoose';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum LogisticsProvider {
  UBER = 'uber',
  BOLT = 'bolt',
  IN_HOUSE = 'in_house',
  SELLER = 'seller',
}

export interface TrackingEvent {
  event: string;
  timestamp: Date;
  location: string | null;
  provider: string | null;
}

export interface PodArtifact {
  type: 'photo' | 'signature' | 'gps';
  url: string | null;
  coordinates: { lat: number; lng: number } | null;
  capturedAt: Date;
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  collection: 'logistics_bookings',
})
export class LogisticsBooking extends BaseSchema {
  @Prop({ required: true, unique: true, index: true })
  bookingRef!: string;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
  orderId!: Types.ObjectId;

  @Prop({ required: true })
  orderRef!: string;

  @Prop({ type: String, enum: LogisticsProvider, required: true })
  provider!: LogisticsProvider;

  @Prop({ type: String, enum: BookingStatus, default: BookingStatus.PENDING, index: true })
  status!: BookingStatus;

  @Prop({ default: null })
  externalBookingId!: string | null;

  @Prop({ default: null })
  trackingUrl!: string | null;

  @Prop({ type: Object, default: null })
  pickupAddress!: {
    street1: string;
    city: string;
    state: string;
    country: string;
    lat: number | null;
    lng: number | null;
  } | null;

  @Prop({ type: Object, default: null })
  dropoffAddress!: {
    street1: string;
    city: string;
    state: string;
    country: string;
    lat: number | null;
    lng: number | null;
  } | null;

  @Prop({ type: [Object], default: [] })
  trackingEvents!: TrackingEvent[];

  @Prop({ type: [Object], default: [] })
  podArtifacts!: PodArtifact[];

  @Prop({ default: 0 })
  quotedFeeKobo!: number;

  @Prop({ default: null })
  cancelReason!: string | null;

  @Prop({ default: 0 })
  retryCount!: number;
}

export const LogisticsBookingSchema = SchemaFactory.createForClass(LogisticsBooking);

LogisticsBookingSchema.index({ orderId: 1 });
LogisticsBookingSchema.index({ status: 1, provider: 1 });
