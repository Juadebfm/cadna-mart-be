import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import { Types } from 'mongoose';

export enum PromoSlotStatus {
  AVAILABLE = 'available',
  PARTIALLY_BOOKED = 'partially_booked',
  FULL = 'full',
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  collection: 'promo_slots',
})
export class PromoSlot extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'SlotType', required: true })
  slotTypeId!: Types.ObjectId;

  @Prop({ required: true })
  date!: string;

  @Prop({ required: true })
  capacity!: number;

  @Prop({ default: 0 })
  bookedCount!: number;

  @Prop({ type: String, enum: PromoSlotStatus, default: PromoSlotStatus.AVAILABLE })
  status!: PromoSlotStatus;

  @Prop({ type: Date, required: true })
  startsAt!: Date;

  @Prop({ type: Date, required: true })
  endsAt!: Date;
}

export const PromoSlotSchema = SchemaFactory.createForClass(PromoSlot);
PromoSlotSchema.index({ slotTypeId: 1, date: 1 });
PromoSlotSchema.index({ status: 1, startsAt: 1 });
