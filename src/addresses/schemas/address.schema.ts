import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BaseSchema } from '@shared/base/base.schema';

@Schema({ timestamps: true })
export class Address extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, default: null })
  label!: string | null;

  @Prop({ required: true, trim: true })
  recipientName!: string;

  @Prop({ required: true, trim: true })
  phoneNumber!: string;

  @Prop({ required: true, trim: true })
  street1!: string;

  @Prop({ type: String, default: null })
  street2!: string | null;

  @Prop({ required: true, trim: true })
  city!: string;

  @Prop({ required: true, trim: true })
  state!: string;

  @Prop({ default: 'Nigeria', trim: true })
  country!: string;

  @Prop({ type: String, default: null })
  postalCode!: string | null;

  @Prop({ default: false })
  isDefault!: boolean;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

AddressSchema.index({ userId: 1, deletedAt: 1 });
AddressSchema.index({ userId: 1, isDefault: 1 });
