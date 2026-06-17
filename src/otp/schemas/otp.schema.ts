import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OtpType } from '../enums/otp-type.enum';

@Schema({ timestamps: true })
export class Otp extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId!: Types.ObjectId | null;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  code!: string;

  @Prop({ type: String, enum: OtpType, required: true })
  type!: OtpType;

  @Prop({ required: true, type: Date })
  expiresAt!: Date;

  @Prop({ default: false })
  isUsed!: boolean;

  @Prop({ default: 0 })
  attempts!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

OtpSchema.index({ email: 1, type: 1 });
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
