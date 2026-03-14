import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import * as mongoose from 'mongoose';

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
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true })
  user!: mongoose.Types.ObjectId;

  @Prop({ type: [CartItemSchema], default: [] })
  items!: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);

CartSchema.index({ user: 1 });
