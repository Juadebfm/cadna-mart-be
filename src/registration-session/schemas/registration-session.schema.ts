import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class RegistrationSession extends Document {
  @Prop({ required: true, unique: true, default: uuidv4 })
  sessionId!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, default: null, trim: true })
  firstName!: string | null;

  @Prop({ type: String, default: null, trim: true })
  lastName!: string | null;

  @Prop({ type: Date, default: null })
  dateOfBirth!: Date | null;

  @Prop({ type: String, default: null })
  phoneNumber!: string | null;

  @Prop({ default: false })
  termsAccepted!: boolean;

  @Prop({ default: 1 })
  currentStep!: number;

  @Prop({ required: true, type: Date })
  expiresAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const RegistrationSessionSchema = SchemaFactory.createForClass(RegistrationSession);

RegistrationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
