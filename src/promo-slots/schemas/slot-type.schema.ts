import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';

export enum SlotPlacement {
  FLASH_SALE = 'flash_sale',
  BEST_DEAL = 'best_deal',
  FEATURED = 'featured',
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  collection: 'promo_slot_types',
})
export class SlotType extends BaseSchema {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, enum: SlotPlacement, required: true })
  placement!: SlotPlacement;

  @Prop({ required: true, min: 1 })
  maxItems!: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: null })
  description!: string | null;
}

export const SlotTypeSchema = SchemaFactory.createForClass(SlotType);
SlotTypeSchema.index({ placement: 1 });
