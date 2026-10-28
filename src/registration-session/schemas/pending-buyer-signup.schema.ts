import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class PendingBuyerSignup extends Document {
  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ type: Date, default: null })
  dateOfBirth!: Date | null;

  @Prop({ type: String, default: null })
  phoneNumber!: string | null;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ default: false })
  termsAccepted!: boolean;

  @Prop({ required: true, type: Date })
  expiresAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PendingBuyerSignupSchema = SchemaFactory.createForClass(PendingBuyerSignup);

PendingBuyerSignupSchema.index({ email: 1 }, { unique: true });
PendingBuyerSignupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
