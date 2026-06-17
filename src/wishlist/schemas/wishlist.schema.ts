import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import * as mongoose from 'mongoose';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
})
export class WishlistItem extends BaseSchema {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user!: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true })
  product!: mongoose.Types.ObjectId;
}

export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

WishlistItemSchema.index({ user: 1, product: 1 }, { unique: true });
WishlistItemSchema.index({ user: 1, createdAt: -1 });
