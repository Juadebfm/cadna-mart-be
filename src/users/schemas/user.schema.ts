import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import { AccountType } from '../enums/account-type.enum';
import { AuthProvider } from '../enums/auth-provider.enum';

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      delete ret.password;
      delete ret.refreshToken;
      delete ret.__v;
      return ret;
    },
  },
})
export class User extends BaseSchema {
  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, select: false, default: null })
  password!: string | null;

  @Prop({ type: String, enum: AccountType, required: true })
  accountType!: AccountType;

  @Prop({ type: String, enum: AuthProvider, default: AuthProvider.LOCAL })
  authProvider!: AuthProvider;

  @Prop({ type: String, default: null })
  clerkId!: string | null;

  @Prop({ type: String, default: null })
  phoneNumber!: string | null;

  @Prop({ type: Date, default: null })
  dateOfBirth!: Date | null;

  @Prop({ default: false })
  isVerified!: boolean;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isTwoFactorEnabled!: boolean;

  @Prop({ type: Date, default: null })
  termsAcceptedAt!: Date | null;

  @Prop({ type: Date, default: null })
  lastLoginAt!: Date | null;

  @Prop({ type: String, default: null, select: false })
  refreshToken!: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual('fullName').get(function (this: User) {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.index({ accountType: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ clerkId: 1 }, { sparse: true });
UserSchema.index({ email: 1, deletedAt: 1 });
