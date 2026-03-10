import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import * as mongoose from 'mongoose';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
})
export class Store extends BaseSchema {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug!: string;

  @Prop({ type: String, default: null })
  logoUrl!: string | null;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  owner!: mongoose.Types.ObjectId;

  @Prop({ default: false })
  isVerified!: boolean;

  @Prop({ default: 0, min: 0, max: 100 })
  responseRatePercent!: number;

  @Prop({ default: 0 })
  averageRating!: number;

  @Prop({ default: 0 })
  reviewCount!: number;

  @Prop({ type: Number, default: null })
  joinedYear!: number | null;

  @Prop({ default: true })
  isActive!: boolean;
}

export const StoreSchema = SchemaFactory.createForClass(Store);

StoreSchema.index({ slug: 1 });
StoreSchema.index({ owner: 1 });
