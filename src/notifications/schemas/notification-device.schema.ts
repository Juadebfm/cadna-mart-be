import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'notification_devices' })
export class NotificationDevice {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, select: false })
  fid!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const NotificationDeviceSchema = SchemaFactory.createForClass(NotificationDevice);
NotificationDeviceSchema.index(
  { fid: 1 },
  { unique: true, name: 'notification_device_fid_unique' },
);
NotificationDeviceSchema.index({ userId: 1, updatedAt: -1 });
