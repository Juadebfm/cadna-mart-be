import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './schemas/notification.schema';
import { NotificationDevice } from './schemas/notification-device.schema';

@Injectable()
export class NotificationsRepository implements OnModuleInit {
  constructor(
    @InjectModel(Notification.name) private readonly model: Model<Notification>,
    @InjectModel(NotificationDevice.name) private readonly deviceModel: Model<NotificationDevice>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Production disables Mongoose autoIndex. The unique index prevents one
    // Firebase installation ID from being attached to two buyer accounts.
    await this.deviceModel.createIndexes();
  }

  async findByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Notification[]; totalItems: number }> {
    const filter = { userId: new Types.ObjectId(userId), deletedAt: null };
    const [items, totalItems] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as unknown as Promise<Notification[]>,
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async markRead(id: string, userId: string): Promise<Notification | null> {
    return this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { isRead: true, readAt: new Date() },
        { new: true },
      )
      .lean()
      .exec() as unknown as Promise<Notification | null>;
  }

  async create(data: Partial<Notification>): Promise<Notification> {
    return this.model.create(data);
  }

  async registerDevice(userId: string, fid: string): Promise<void> {
    try {
      await this.deviceModel
        .updateOne(
          { fid, userId: new Types.ObjectId(userId) },
          { $setOnInsert: { userId: new Types.ObjectId(userId), fid } },
          { upsert: true },
        )
        .exec();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('This device is registered to another account.');
      }
      throw error;
    }
  }

  async removeDevice(userId: string, fid: string): Promise<void> {
    await this.deviceModel.deleteOne({ userId: new Types.ObjectId(userId), fid }).exec();
  }

  async findDeviceFids(userId: string): Promise<Array<{ _id: Types.ObjectId; fid: string }>> {
    return this.deviceModel
      .find({ userId: new Types.ObjectId(userId) })
      .select('+fid _id')
      .lean()
      .exec() as unknown as Promise<Array<{ _id: Types.ObjectId; fid: string }>>;
  }

  async removeDevicesByIds(ids: Types.ObjectId[]): Promise<void> {
    if (ids.length === 0) return;
    await this.deviceModel.deleteMany({ _id: { $in: ids } }).exec();
  }
}
