import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import { Types } from 'mongoose';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  collection: 'promo_duration_tiers',
})
export class DurationTier extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'SlotType', required: true })
  slotTypeId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  label!: string;

  @Prop({ required: true, min: 1 })
  durationHours!: number;

  @Prop({ required: true, min: 0 })
  priceNGN!: number;

  @Prop({ default: true })
  isActive!: boolean;
}

export const DurationTierSchema = SchemaFactory.createForClass(DurationTier);
DurationTierSchema.index({ slotTypeId: 1 });
