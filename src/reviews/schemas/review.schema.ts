import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import * as mongoose from 'mongoose';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
})
export class Review extends BaseSchema {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true })
  product!: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user!: mongoose.Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ type: String, default: null })
  title!: string | null;

  @Prop({ type: String, default: null })
  comment!: string | null;

  @Prop({ default: '' })
  reviewerName!: string;

  @Prop({ default: false })
  isVerifiedPurchase!: boolean;

  @Prop({ default: 0 })
  helpfulCount!: number;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ product: 1, createdAt: -1 });
ReviewSchema.index({ product: 1, rating: -1 });
ReviewSchema.index({ user: 1, product: 1 }, { unique: true });
