import { Prop, Schema } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class BaseSchema extends Document {
  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;

  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}
