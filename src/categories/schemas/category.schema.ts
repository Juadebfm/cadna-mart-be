import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import * as mongoose from 'mongoose';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
})
export class Category extends BaseSchema {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug!: string;

  @Prop({ type: String, default: null })
  iconUrl!: string | null;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null })
  parent!: mongoose.Types.ObjectId | null;

  @Prop({ default: 0 })
  productCount!: number;

  @Prop({ default: 0 })
  order!: number;

  @Prop({ default: true })
  isActive!: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ slug: 1 });
CategorySchema.index({ parent: 1 });
CategorySchema.index({ order: 1 });
