import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import * as mongoose from 'mongoose';

@Schema({ _id: false })
class Money {
  @Prop({ required: true })
  amount!: number;

  @Prop({ default: 'NGN' })
  currency!: string;

  @Prop({ required: true })
  formatted!: string;
}

@Schema({ _id: false })
class GalleryImage {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  url!: string;

  @Prop({ type: String, default: null })
  alt!: string | null;
}

@Schema({ _id: false })
class VariantOption {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({ type: String, default: null })
  swatchHex!: string | null;
}

@Schema({ _id: false })
class VariantAxis {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  displayName!: string;

  @Prop({ type: [{ type: Object }] })
  options!: VariantOption[];
}

@Schema({ _id: false })
class ProductVariant {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  sku!: string;

  @Prop({ type: mongoose.Schema.Types.Mixed, required: true })
  attributes!: Record<string, string>;

  @Prop({ type: Object, required: true })
  price!: Money;

  @Prop({ default: 0 })
  stockQty!: number;

  @Prop({ default: true })
  isInStock!: boolean;

  @Prop({ type: [String], default: [] })
  images!: string[];
}

@Schema({ _id: false })
class Specification {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  value!: string;
}

@Schema({ _id: false })
class Breadcrumb {
  @Prop({ required: true })
  label!: string;

  @Prop({ type: String, default: null })
  url!: string | null;
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
})
export class Product extends BaseSchema {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug!: string;

  @Prop({ type: String, default: null })
  sku!: string | null;

  @Prop({ type: String, default: null })
  brand!: string | null;

  @Prop({ type: String, default: null })
  thumbnailUrl!: string | null;

  @Prop({ type: Object, required: true })
  price!: Money;

  @Prop({ type: Object, default: null })
  originalPrice!: Money | null;

  @Prop({ default: 0 })
  discountPercent!: number;

  @Prop({ type: Object, default: null })
  savings!: Money | null;

  @Prop({ type: [Object], default: [] })
  gallery!: GalleryImage[];

  @Prop({ type: [Object], default: [] })
  variantAxes!: VariantAxis[];

  @Prop({ type: [Object], default: [] })
  variants!: ProductVariant[];

  @Prop({ type: String, default: null })
  defaultVariantId!: string | null;

  @Prop({ type: String, default: null })
  descriptionHtml!: string | null;

  @Prop({ type: [Object], default: [] })
  specifications!: Specification[];

  @Prop({ type: [Object], default: [] })
  breadcrumbs!: Breadcrumb[];

  @Prop({ default: 0 })
  rating!: number;

  @Prop({ default: 0 })
  reviewCount!: number;

  @Prop({ type: String, default: 'in_stock' })
  inventoryStatus!: string;

  @Prop({ type: String, default: null })
  badge!: string | null;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null })
  category!: mongoose.Types.ObjectId | null;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null })
  subCategory!: mongoose.Types.ObjectId | null;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true })
  store!: mongoose.Types.ObjectId;

  @Prop({ type: [String], default: [] })
  sections!: string[];

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: 0 })
  salesCount!: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ slug: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ subCategory: 1 });
ProductSchema.index({ store: 1 });
ProductSchema.index({ sections: 1 });
ProductSchema.index({ 'price.amount': 1 });
ProductSchema.index({ rating: -1 });
ProductSchema.index({ salesCount: -1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ name: 'text', brand: 'text' });
