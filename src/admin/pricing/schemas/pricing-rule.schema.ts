import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';

export enum PricingRuleType {
  MARKUP = 'markup',
  PLATFORM_FEE = 'platform_fee',
  DELIVERY_FEE = 'delivery_fee',
}

export enum PricingRuleScope {
  ALL = 'all',
  CATEGORY = 'category',
  BRAND = 'brand',
}

export enum PricingRuleValueType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

@Schema({ timestamps: true, toJSON: { virtuals: true } })
export class PricingRule extends BaseSchema {
  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, enum: PricingRuleType, required: true })
  type!: PricingRuleType;

  @Prop({ type: String, enum: PricingRuleScope, required: true, default: PricingRuleScope.ALL })
  scope!: PricingRuleScope;

  @Prop({ type: String, default: null })
  scopeValue!: string | null;

  @Prop({ type: Number, required: true })
  value!: number;

  @Prop({
    type: String,
    enum: PricingRuleValueType,
    required: true,
    default: PricingRuleValueType.PERCENT,
  })
  valueType!: PricingRuleValueType;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  @Prop({ type: String, default: null })
  description!: string | null;
}

export const PricingRuleSchema = SchemaFactory.createForClass(PricingRule);
