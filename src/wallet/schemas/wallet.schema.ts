import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import { Types } from 'mongoose';

export interface WalletHold {
  holdId: string;
  amount: number;
  orderId: string;
  expiresAt: Date;
}

@Schema({ timestamps: true, toJSON: { virtuals: true }, collection: 'wallets' })
export class Wallet extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ default: 0, min: 0 })
  balanceKobo!: number;

  @Prop({ type: String, default: 'bronze' })
  tier!: string;

  @Prop({ type: [Object], default: [] })
  holds!: WalletHold[];
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
