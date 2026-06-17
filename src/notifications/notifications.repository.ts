import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './schemas/notification.schema';

@Injectable()
export class NotificationsRepository {
  constructor(@InjectModel(Notification.name) private readonly model: Model<Notification>) {}

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
        .exec() as Promise<Notification[]>,
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
      .exec() as Promise<Notification | null>;
  }

  async create(data: Partial<Notification>): Promise<Notification> {
    return this.model.create(data);
  }
}
