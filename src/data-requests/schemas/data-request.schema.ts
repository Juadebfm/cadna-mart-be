import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum DataRequestKind {
  EXPORT = 'export',
  DELETE = 'delete',
}

export enum DataRequestStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class DataRequest extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: DataRequestKind, required: true })
  kind!: DataRequestKind;

  @Prop({ type: String, enum: DataRequestStatus, default: DataRequestStatus.PENDING, index: true })
  status!: DataRequestStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  processedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  processedAt!: Date | null;

  @Prop({ type: String, default: null })
  notes!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const DataRequestSchema = SchemaFactory.createForClass(DataRequest);

DataRequestSchema.index({ userId: 1, kind: 1, status: 1 });
