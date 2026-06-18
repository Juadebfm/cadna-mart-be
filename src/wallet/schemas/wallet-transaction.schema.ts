import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import { Types } from 'mongoose';

export enum WalletTransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  TOPUP = 'topup',
  TRANSFER = 'transfer',
  HOLD = 'hold',
  RELEASE = 'release',
  REFUND = 'refund',
}

@Schema({ timestamps: true, toJSON: { virtuals: true }, collection: 'wallet_transactions' })
export class WalletTransaction extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Wallet', required: true, index: true })
  walletId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: WalletTransactionType, required: true })
  type!: WalletTransactionType;

  @Prop({ required: true, min: 0 })
  amountKobo!: number;

  @Prop({ required: true })
  runningBalanceKobo!: number;

  @Prop({ type: String, default: null })
  reference!: string | null;

  @Prop({ type: String, default: null })
  orderId!: string | null;

  @Prop({ required: true })
  description!: string;
}

export const WalletTransactionSchema = SchemaFactory.createForClass(WalletTransaction);
WalletTransactionSchema.index({ walletId: 1, createdAt: -1 });
