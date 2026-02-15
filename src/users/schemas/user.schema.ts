import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import { Role } from '../enums/role.enum';

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      delete ret.password;
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

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ type: String, enum: Role, default: Role.USER })
  role!: Role;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Date, default: null })
  lastLoginAt!: Date | null;

  @Prop({ type: String, default: null })
  refreshToken!: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual('fullName').get(function (this: User) {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });
