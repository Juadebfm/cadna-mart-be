import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import * as mongoose from 'mongoose';

@Schema({ _id: false })
class PolicyItem {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  summary!: string;

  @Prop({ type: String, default: null })
  detailsUrl!: string | null;
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
})
export class ProductPolicy extends BaseSchema {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true })
  product!: mongoose.Types.ObjectId;

  @Prop({ type: Object, required: true })
  returnPolicy!: PolicyItem;

  @Prop({ type: Object, required: true })
  warrantyPolicy!: PolicyItem;
}

export const ProductPolicySchema = SchemaFactory.createForClass(ProductPolicy);
