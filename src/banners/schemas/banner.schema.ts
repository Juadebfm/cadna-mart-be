import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';

export enum BannerType {
  HERO = 'hero',
  CAMPAIGN = 'campaign',
  FLASH_SALE = 'flash_sale',
  GROWTH_CARD = 'growth_card',
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
})
export class Banner extends BaseSchema {
  @Prop({ type: String, enum: BannerType, required: true })
  type!: BannerType;

  @Prop({ required: true })
  title!: string;

  @Prop({ type: String, default: null })
  subtitle!: string | null;

  @Prop({ type: String, default: null })
  description!: string | null;

  @Prop({ type: String, default: null })
  imageUrl!: string | null;

  @Prop({ type: String, default: null })
  mobileImageUrl!: string | null;

  @Prop({ type: String, default: null })
  ctaLabel!: string | null;

  @Prop({ type: String, default: null })
  ctaUrl!: string | null;

  @Prop({ type: String, default: null })
  discountLabel!: string | null;

  @Prop({ type: Date, default: null })
  startAt!: Date | null;

  @Prop({ type: Date, default: null })
  endAt!: Date | null;

  @Prop({ default: 0 })
  order!: number;

  @Prop({ default: true })
  isActive!: boolean;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);

BannerSchema.index({ type: 1, isActive: 1, order: 1 });
