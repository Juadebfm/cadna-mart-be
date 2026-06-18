import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import { Types } from 'mongoose';

// Singleton program config (keyed by a fixed slug)
@Schema({ timestamps: true, toJSON: { virtuals: true }, collection: 'rewards_program' })
export class RewardsProgram extends BaseSchema {
  @Prop({ required: true, unique: true })
  slug!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ default: null })
  tagline!: string | null;

  @Prop({ default: null })
  logoUrl!: string | null;
}

export const RewardsProgramSchema = SchemaFactory.createForClass(RewardsProgram);

// Tier definitions (e.g. Bronze, Silver, Gold)
@Schema({ timestamps: true, toJSON: { virtuals: true }, collection: 'rewards_tiers' })
export class RewardsTier extends BaseSchema {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, min: 0 })
  minPoints!: number;

  @Prop({ default: null })
  maxPoints!: number | null;

  @Prop({ required: true, min: 0, max: 1 })
  cashbackRate!: number;
}

export const RewardsTierSchema = SchemaFactory.createForClass(RewardsTier);

// Festive / seasonal campaigns
@Schema({ timestamps: true, toJSON: { virtuals: true }, collection: 'rewards_campaigns' })
export class RewardsCampaign extends BaseSchema {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  startsAt!: Date;

  @Prop({ required: true })
  endsAt!: Date;

  @Prop({ default: 1.0, min: 1.0 })
  pointsMultiplier!: number;

  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const RewardsCampaignSchema = SchemaFactory.createForClass(RewardsCampaign);

// Per-user rewards account (points balance, tier, cashback)
@Schema({ timestamps: true, toJSON: { virtuals: true }, collection: 'rewards_accounts' })
export class RewardsAccount extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ default: 0, min: 0 })
  points!: number;

  @Prop({ default: 0, min: 0 })
  cashbackKobo!: number;

  @Prop({ default: 'bronze' })
  tier!: string;

  @Prop({ default: false })
  isAffiliate!: boolean;

  @Prop({ default: null })
  affiliateCode!: string | null;

  @Prop({ default: null })
  referredBy!: string | null;
}

export const RewardsAccountSchema = SchemaFactory.createForClass(RewardsAccount);

// Rewards transaction ledger
@Schema({ timestamps: true, toJSON: { virtuals: true }, collection: 'rewards_transactions' })
export class RewardsTransaction extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'RewardsAccount', required: true, index: true })
  accountId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['earn', 'redeem', 'expire', 'affiliate_earn', 'cashback_credit'],
    required: true,
  })
  type!: string;

  @Prop({ default: 0 })
  points!: number;

  @Prop({ default: 0 })
  cashbackKobo!: number;

  @Prop({ required: true })
  description!: string;

  @Prop({ default: null })
  orderId!: string | null;
}

export const RewardsTransactionSchema = SchemaFactory.createForClass(RewardsTransaction);
