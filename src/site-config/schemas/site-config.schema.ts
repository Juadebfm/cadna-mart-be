import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SiteConfig extends Document {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ type: Object, required: true })
  value!: Record<string, unknown>;
}

export const SiteConfigSchema = SchemaFactory.createForClass(SiteConfig);
