import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import * as mongoose from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'seller_followers',
})
export class SellerFollower extends BaseSchema {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user!: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true })
  seller!: mongoose.Types.ObjectId;
}

export const SellerFollowerSchema = SchemaFactory.createForClass(SellerFollower);

SellerFollowerSchema.index({ user: 1, seller: 1 }, { unique: true });
SellerFollowerSchema.index({ seller: 1 });
