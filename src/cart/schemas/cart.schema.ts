import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import * as mongoose from 'mongoose';

export enum CartOwnerType {
  USER = 'user',
  GUEST = 'guest',
}

@Schema({ timestamps: true })
class CartItem {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true })
  product!: mongoose.Types.ObjectId;

  @Prop({ type: String, default: null })
  variantId!: string | null;

  @Prop({ required: true, min: 1 })
  quantity!: number;
}

const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
})
export class Cart extends BaseSchema {
  @Prop({ type: String, required: true, unique: true, index: true })
  publicCartId!: string;

  @Prop({ type: String, enum: CartOwnerType, required: true, default: CartOwnerType.USER })
  ownerType!: CartOwnerType;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, sparse: true })
  user!: mongoose.Types.ObjectId | null;

  @Prop({ type: String, default: null, select: false })
  guestTokenHash!: string | null;

  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;

  @Prop({ type: [CartItemSchema], default: [] })
  items!: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);

CartSchema.index({ user: 1 }, { unique: true, sparse: true });
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
