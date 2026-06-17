import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum AuthEventKind {
  LOGIN = 'login',
  LOGIN_OTP = 'login_otp',
  LOGIN_2FA = 'login_2fa',
  LOGOUT = 'logout',
  REFRESH = 'refresh',
  REGISTER = 'register',
  PASSWORD_RESET = 'password_reset',
  TWO_FACTOR_ENABLE = '2fa_enable',
  TWO_FACTOR_DISABLE = '2fa_disable',
  CLERK_LOGIN = 'clerk_login',
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AuthEvent extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true, default: null })
  userId!: Types.ObjectId | null;

  @Prop({ type: String, enum: AuthEventKind, required: true, index: true })
  kind!: AuthEventKind;

  @Prop({ default: true })
  succeeded!: boolean;

  @Prop({ type: String, default: null })
  ip!: string | null;

  @Prop({ type: String, default: null })
  userAgent!: string | null;

  createdAt!: Date;
}

export const AuthEventSchema = SchemaFactory.createForClass(AuthEvent);

AuthEventSchema.index({ userId: 1, createdAt: -1 });
