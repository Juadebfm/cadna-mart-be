import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BaseSchema } from '@shared/base/base.schema';

@Schema({ timestamps: true, collection: 'recently_viewed' })
export class RecentlyViewed extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;

  @Prop({ type: Date, default: Date.now, required: true })
  viewedAt!: Date;
}

export const RecentlyViewedSchema = SchemaFactory.createForClass(RecentlyViewed);
RecentlyViewedSchema.index({ user: 1, product: 1 }, { unique: true });
RecentlyViewedSchema.index({ user: 1, viewedAt: -1 });
